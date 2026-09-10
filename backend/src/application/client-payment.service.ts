import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import QRCode from "qrcode";
import type { ClientPaymentObject, PaymentAuditEvent, PaymentPart, PaymentTermsSnapshot } from "../models/clientPayment.js";
import { ClientPaymentRepository } from "../repositories/client-payment.repository.js";
import type { PaymentHighlightCandidate, PaymentHighlightCandidates } from "../repositories/client-payment.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ApplicationError } from "./errors/application-error.js";
import { generatePixBrCode, type PixReceiver } from "../services/pix-br-code.js";
import { chargePartStatus, chargeStatus, FINANCIAL_CURRENCY, FINANCIAL_TIME_ZONE } from "../domain/financial-domain.js";
import {
    calculatePaymentSchedule,
    type PaymentSchedule,
    type PaymentSchedulePreview
} from "./financial/payment-schedule.js";
import {
    integerInRange,
    paidValue,
    paymentTitle,
    paymentVersion,
    pixPartType,
    type PaymentFields
} from "./financial/payment-input.js";
export { calculatePaymentSchedule, monthlyDueDate } from "./financial/payment-schedule.js";
export type { PaymentSchedule, PaymentSchedulePreview } from "./financial/payment-schedule.js";
export type { PaymentFields } from "./financial/payment-input.js";

const PIX_ANALYSIS_WINDOW_MS = 5 * 60 * 60 * 1000;
const DEFAULT_PAYMENT_PAGE_SIZE = 20;
const MAX_PAYMENT_PAGE_SIZE = 100;

export interface PaymentActor {
    id: string;
    sessionId: string;
    role: "admin" | "client";
}

export class ClientPaymentService {
    constructor(
        private readonly pixReceiver: PixReceiver,
        private readonly clients = new ClientRepository(),
        private readonly payments = new ClientPaymentRepository()
    ) {}

    preview(fields: PaymentFields): PaymentSchedulePreview {
        const schedule = calculatePaymentSchedule(fields);
        return {
            downPaymentCents: schedule.downPayment.amountCents,
            firstDueDate: schedule.firstDueDate,
            installments: schedule.installments.map(({ amountCents, dueDate }) => ({ amountCents, dueDate })),
            finalAmountCents: schedule.finalAmountCents
        };
    }

    async list(clientId: string, cursorValue?: unknown, limitValue?: unknown) {
        await this.requireClient(clientId);
        const options = paymentPageOptions(cursorValue, limitValue);
        const { page, summary, highlight } = await loadPaymentPage(this.payments, clientId, options);
        return paymentPageResponse(page, summary, highlight, options.limit, paymentResponse);
    }

    async listForClient(clientId: string, cursorValue?: unknown, limitValue?: unknown) {
        await this.requireClient(clientId);
        const options = paymentPageOptions(cursorValue, limitValue);
        const { page, summary, highlight } = await loadPaymentPage(this.payments, clientId, options);
        return paymentPageResponse(page, summary, highlight, options.limit, clientPaymentResponse);
    }

    async create(clientId: string, fields: PaymentFields, actor: PaymentActor) {
        await this.requireClient(clientId);
        const title = paymentTitle(fields.title);
        const schedule = calculatePaymentSchedule({
            ...fields,
            downPaymentIsPaid: undefined,
            paidInstallmentNumbers: undefined
        });
        return paymentResponse(await this.payments.create({
            clientId: new mongoose.Types.ObjectId(clientId),
            title,
            ...schedule,
            currency: FINANCIAL_CURRENCY,
            timeZone: FINANCIAL_TIME_ZONE,
            status: "open",
            hasReceiptHistory: false,
            events: [auditEvent("created", actor, { after: termsSnapshot(title, schedule) })]
        }));
    }

    async edit(clientId: string, paymentId: string, fields: PaymentFields, actor: PaymentActor) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        const version = paymentVersion(fields.version);
        if ((existing.__v ?? 0) !== version) throw conflictError();
        const title = paymentTitle(fields.title);
        const schedule = calculatePaymentSchedule({
            ...fields,
            downPaymentIsPaid: undefined,
            paidInstallmentNumbers: undefined
        }, existing);
        if (hasConfirmedReceiptHistory(existing) && financialTermsChanged(existing, schedule)) {
            throw new ApplicationError(
                "As condições financeiras não podem ser alteradas depois da confirmação de um recebimento",
                409
            );
        }
        if (hasConfirmedReceiptHistory(existing)) preservePixAttempts(schedule, existing);
        const event = auditEvent("terms-updated", actor, {
            before: termsSnapshot(existing.title, existing),
            after: termsSnapshot(title, schedule)
        });
        const updated = await this.payments.update(paymentId, clientId, version, { title, ...schedule }, event);
        if (!updated) throw conflictError();
        return paymentResponse(updated);
    }

    async remove(
        clientId: string,
        paymentId: string,
        versionValue: unknown,
        confirmedReceiptHistoryAcknowledged: unknown,
        actor: PaymentActor
    ): Promise<void> {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const version = paymentVersion(versionValue);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        if ((existing.__v ?? 0) !== version) throw conflictError();

        const hadConfirmedReceiptHistory = hasConfirmedReceiptHistory(existing);
        if (hadConfirmedReceiptHistory && confirmedReceiptHistoryAcknowledged !== true) {
            throw new ApplicationError(
                "Confirme explicitamente a remoção do pagamento que possui recebimentos confirmados",
                409
            );
        }

        const event = auditEvent("archived", actor, { hadConfirmedReceiptHistory });
        if (!await this.payments.archive(paymentId, clientId, version, event)) throw conflictError();
    }

    async setDownPaymentPaid(clientId: string, paymentId: string, value: unknown, versionValue: unknown, actor: PaymentActor) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const isPaid = paidValue(value);
        const version = paymentVersion(versionValue);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        if ((existing.__v ?? 0) !== version) throw conflictError();
        if (isPaid && existing.downPayment.amountCents === 0) throw new ApplicationError("Este pagamento não possui entrada", 400);
        if (existing.downPayment.isPaid === isPaid) return paymentResponse(existing);
        const event = auditEvent("manual-status-change", actor, {
            partType: "down-payment",
            previousIsPaid: existing.downPayment.isPaid,
            isPaid,
            ...(isPaid
                ? { receiptId: randomUUID() }
                : { reversesReceiptId: existing.downPayment.settlementReceiptId ?? legacyReceiptId(paymentId, "down-payment") })
        });
        const nextStatus = statusAfterChange(existing, "down-payment", undefined, isPaid);
        const updated = await this.payments.setDownPaymentPaid(paymentId, clientId, version, isPaid, event, nextStatus);
        if (!updated) throw conflictError();
        return paymentResponse(updated);
    }

    async setInstallmentPaid(clientId: string, paymentId: string, installmentNumber: unknown, value: unknown, versionValue: unknown, actor: PaymentActor) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const number = integerInRange(installmentNumber, "A parcela", 1, 120);
        const isPaid = paidValue(value);
        const version = paymentVersion(versionValue);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        if ((existing.__v ?? 0) !== version) throw conflictError();
        const installment = existing.installments.find(item => item.number === number);
        if (!installment) throw new ApplicationError("Parcela não encontrada", 404);
        if (installment.isPaid === isPaid) return paymentResponse(existing);
        const event = auditEvent("manual-status-change", actor, {
            partType: "installment",
            installmentNumber: number,
            previousIsPaid: installment.isPaid,
            isPaid,
            ...(isPaid
                ? { receiptId: randomUUID() }
                : { reversesReceiptId: installment.settlementReceiptId ?? legacyReceiptId(paymentId, "installment", number) })
        });
        const nextStatus = statusAfterChange(existing, "installment", number, isPaid);
        const updated = await this.payments.setInstallmentPaid(paymentId, clientId, version, number, isPaid, event, nextStatus);
        if (!updated) throw conflictError();
        return paymentResponse(updated);
    }

    async generatePix(
        clientId: string,
        paymentId: string,
        partTypeValue: unknown,
        installmentNumberValue: unknown,
        actor: PaymentActor
    ) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        const partType = pixPartType(partTypeValue);
        const installmentNumber = partType === "installment"
            ? integerInRange(installmentNumberValue, "A parcela", 1, 120)
            : undefined;
        const part = partType === "down-payment"
            ? existing.downPayment
            : existing.installments.find(item => item.number === installmentNumber);
        if (!part) throw new ApplicationError("Parcela não encontrada", 404);
        if (part.isPaid) throw new ApplicationError("Este pagamento já foi confirmado", 409);
        if (part.amountCents < 1) throw new ApplicationError("Este pagamento não possui valor para Pix", 400);

        const now = new Date();
        const currentAnalysisWindowEnd = part.pix ? pixAnalysisWindowEnd(part.pix) : undefined;
        if (part.pix && part.pix.txid === "***" && currentAnalysisWindowEnd
            && currentAnalysisWindowEnd.getTime() > now.getTime()) {
            return pixResponse(existing, partType, installmentNumber, part, await pixQrCode(part.pix.brCode));
        }

        const txid = "***";
        const generatedAt = now;
        const analysisWindowEndsAt = new Date(now.getTime() + PIX_ANALYSIS_WINDOW_MS);
        const pix = {
            txid,
            brCode: generatePixBrCode(part.amountCents, txid, this.pixReceiver),
            generatedAt,
            analysisWindowEndsAt
        };
        const event = auditEvent("pix-code-generated", actor, {
            partType,
            ...(installmentNumber === undefined ? {} : { installmentNumber }),
            pixTxid: txid,
            pixAnalysisWindowEndsAt: analysisWindowEndsAt
        });
        const version = existing.__v ?? 0;
        const updated = partType === "down-payment"
            ? await this.payments.setDownPaymentPix(paymentId, clientId, version, pix, event)
            : await this.payments.setInstallmentPix(paymentId, clientId, version, installmentNumber!, pix, event);
        if (!updated) throw conflictError();
        const updatedPart = partType === "down-payment"
            ? updated.downPayment
            : updated.installments.find(item => item.number === installmentNumber)!;
        return pixResponse(updated, partType, installmentNumber, updatedPart, await pixQrCode(pix.brCode));
    }

    private async requireClient(clientId: string): Promise<void> {
        if (!mongoose.isValidObjectId(clientId) || !await this.clients.findById(clientId)) {
            throw new ApplicationError("Cliente não encontrado", 404);
        }
    }

    private requirePaymentId(paymentId: string): void {
        if (!mongoose.isValidObjectId(paymentId)) throw new ApplicationError("Pagamento não encontrado", 404);
    }
}

function hasConfirmedReceiptHistory(payment: ClientPaymentObject): boolean {
    return payment.hasReceiptHistory === true
        || payment.downPayment.isPaid
        || payment.installments.some(item => item.isPaid)
        || (payment.events ?? []).some(event => event.isPaid === true
            || event.after?.downPaymentIsPaid === true
            || Boolean(event.after?.paidInstallmentNumbers?.length));
}

function financialTermsChanged(payment: ClientPaymentObject, schedule: PaymentSchedule): boolean {
    return payment.totalAmountCents !== schedule.totalAmountCents
        || payment.installmentCount !== schedule.installmentCount
        || payment.firstDueDate !== schedule.firstDueDate
        || payment.downPaymentPercentage !== schedule.downPaymentPercentage
        || payment.discountPercentage !== schedule.discountPercentage
        || payment.interestPercentage !== schedule.interestPercentage
        || payment.discountAmountCents !== schedule.discountAmountCents
        || payment.downPayment.amountCents !== schedule.downPayment.amountCents
        || payment.downPayment.dueDate !== schedule.downPayment.dueDate
        || payment.financedAmountCents !== schedule.financedAmountCents
        || payment.interestAmountCents !== schedule.interestAmountCents
        || payment.installmentTotalCents !== schedule.installmentTotalCents
        || payment.finalAmountCents !== schedule.finalAmountCents
        || payment.installments.length !== schedule.installments.length
        || payment.installments.some((item, index) => {
            const calculated = schedule.installments[index];
            return !calculated || item.number !== calculated.number
                || item.amountCents !== calculated.amountCents
                || item.dueDate !== calculated.dueDate;
        });
}

function preservePixAttempts(schedule: PaymentSchedule, payment: ClientPaymentObject): void {
    if (payment.downPayment.pix) schedule.downPayment.pix = payment.downPayment.pix;
    schedule.installments.forEach((item, index) => {
        const pix = payment.installments[index]?.pix;
        if (pix) item.pix = pix;
    });
}

function paymentResponse(payment: ClientPaymentObject) {
    const paidAmountCents = (payment.downPayment.isPaid ? payment.downPayment.amountCents : 0)
        + payment.installments.reduce((total, item) => total + (item.isPaid ? item.amountCents : 0), 0);
    return {
        id: payment._id.toString(),
        version: payment.__v ?? 0,
        currency: payment.currency ?? FINANCIAL_CURRENCY,
        timeZone: payment.timeZone ?? FINANCIAL_TIME_ZONE,
        status: payment.status ?? chargeStatus([payment.downPayment, ...payment.installments], payment.archivedAt),
        clientId: payment.clientId.toString(),
        title: payment.title,
        totalAmountCents: payment.totalAmountCents,
        installmentCount: payment.installmentCount,
        firstDueDate: payment.firstDueDate,
        downPaymentPercentage: payment.downPaymentPercentage,
        discountPercentage: payment.discountPercentage,
        interestPercentage: payment.interestPercentage,
        discountAmountCents: payment.discountAmountCents,
        downPayment: responsePaymentPart(payment.downPayment),
        financedAmountCents: payment.financedAmountCents,
        interestAmountCents: payment.interestAmountCents,
        installmentTotalCents: payment.installmentTotalCents,
        finalAmountCents: payment.finalAmountCents,
        paidAmountCents,
        remainingAmountCents: Math.max(0, payment.finalAmountCents - paidAmountCents),
        financialTermsLocked: hasConfirmedReceiptHistory(payment),
        installments: payment.installments.map(item => ({ number: item.number, ...responsePaymentPart(item) })),
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
    };
}

function paymentPageOptions(cursorValue: unknown, limitValue: unknown) {
    const parsedLimit = typeof limitValue === "string" && /^\d+$/.test(limitValue) ? Number(limitValue) : DEFAULT_PAYMENT_PAGE_SIZE;
    if (parsedLimit < 1 || parsedLimit > MAX_PAYMENT_PAGE_SIZE) {
        throw new ApplicationError(`O limite deve estar entre 1 e ${MAX_PAYMENT_PAGE_SIZE}`, 400);
    }
    if (cursorValue === undefined || cursorValue === "") return { limit: parsedLimit };
    if (typeof cursorValue !== "string") throw new ApplicationError("Cursor de paginação inválido", 400);
    try {
        const decoded = JSON.parse(Buffer.from(cursorValue, "base64url").toString("utf8")) as { createdAt?: unknown; id?: unknown };
        const createdAt = typeof decoded.createdAt === "string" ? new Date(decoded.createdAt) : new Date(NaN);
        if (!Number.isFinite(createdAt.getTime()) || typeof decoded.id !== "string" || !mongoose.isValidObjectId(decoded.id)) throw new Error();
        return { limit: parsedLimit, cursor: { createdAt, id: new mongoose.Types.ObjectId(decoded.id) } };
    } catch {
        throw new ApplicationError("Cursor de paginação inválido", 400);
    }
}

function paymentPageResponse<T>(
    page: { records: ClientPaymentObject[]; hasMore: boolean },
    summary: { paymentCount: number; totalAmountCents: number; paidAmountCents: number; remainingAmountCents: number },
    highlight: ReturnType<typeof paymentHighlightResponse> | undefined,
    limit: number,
    presenter: (payment: ClientPaymentObject) => T
) {
    const last = page.records[page.records.length - 1];
    const nextCursor = page.hasMore && last
        ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last._id.toString() })).toString("base64url")
        : undefined;
    return { payments: page.records.map(presenter), page: { limit, hasMore: page.hasMore,
        ...(nextCursor ? { nextCursor } : {}) }, summary, highlight };
}

async function loadPaymentPage(
    repository: ClientPaymentRepository,
    clientId: string,
    options: ReturnType<typeof paymentPageOptions>
) {
    const compatible = repository as ClientPaymentRepository & {
        findByClientId?: (id: string) => Promise<ClientPaymentObject[]>;
    };
    if (typeof compatible.findPageByClientId === "function" && typeof compatible.summarizeByClientId === "function") {
        const now = new Date();
        const today = dateOnlyInFinancialTimeZone(now);
        const monthStart = `${today.slice(0, 8)}01`;
        const [year, month] = today.split("-").map(Number);
        const nextMonthStart = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`;
        const [page, summary, candidates] = await Promise.all([
            compatible.findPageByClientId(clientId, options), compatible.summarizeByClientId(clientId),
            typeof compatible.findHighlightCandidatesByClientId === "function"
                ? compatible.findHighlightCandidatesByClientId(clientId, today, monthStart, nextMonthStart)
                : Promise.resolve(undefined)
        ]);
        return { page, summary, highlight: candidates ? selectPaymentHighlight(candidates, today) : undefined };
    }
    const records = await compatible.findByClientId?.(clientId) ?? [];
    const responses = records.map(paymentResponse);
    return {
        page: { records, hasMore: false },
        summary: {
            paymentCount: records.length,
            totalAmountCents: responses.reduce((total, payment) => total + payment.finalAmountCents, 0),
            paidAmountCents: responses.reduce((total, payment) => total + payment.paidAmountCents, 0),
            remainingAmountCents: responses.reduce((total, payment) => total + payment.remainingAmountCents, 0)
        },
        highlight: selectPaymentHighlightFromRecords(records, new Date())
    };
}

function selectPaymentHighlight(candidates: PaymentHighlightCandidates, today: string) {
    const nextWithinWindow = candidates.nextUnpaid
        && dateOnlyDifference(today, candidates.nextUnpaid.dueDate) <= 28
        ? candidates.nextUnpaid : undefined;
    return paymentHighlightResponse(candidates.overdue
        ?? candidates.currentUnpaid
        ?? nextWithinWindow
        ?? candidates.currentLast
        ?? candidates.latestPast);
}

function selectPaymentHighlightFromRecords(records: ClientPaymentObject[], now: Date) {
    const candidates = records.flatMap<PaymentHighlightCandidate>(payment => {
        const down = payment.downPayment.amountCents > 0 ? [{ paymentId: payment._id, paymentTitle: payment.title,
            partType: "down-payment" as const, amountCents: payment.downPayment.amountCents,
            dueDate: payment.downPayment.dueDate ?? payment.firstDueDate, isPaid: payment.downPayment.isPaid,
            pix: payment.downPayment.pix }] : [];
        return [...down, ...payment.installments.map(part => ({ paymentId: payment._id, paymentTitle: payment.title,
            partType: "installment" as const, installmentNumber: part.number, amountCents: part.amountCents,
            dueDate: part.dueDate, isPaid: part.isPaid, pix: part.pix }))];
    }).filter(part => typeof part.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(part.dueDate))
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
    const today = dateOnlyInFinancialTimeZone(now);
    const month = today.slice(0, 7);
    const overdue = candidates.find(part => !part.isPaid && part.dueDate < today);
    const current = candidates.filter(part => part.dueDate.startsWith(month));
    const currentCandidate = current.find(part => !part.isPaid) ?? current[current.length - 1];
    const next = candidates.find(part => !part.isPaid && part.dueDate > today);
    return paymentHighlightResponse(overdue ?? (currentCandidate && !currentCandidate.isPaid ? currentCandidate : undefined)
        ?? (next && dateOnlyDifference(today, next.dueDate) <= 28 ? next : undefined)
        ?? currentCandidate ?? [...candidates].reverse().find(part => part.dueDate <= today));
}

function paymentHighlightResponse(candidate?: PaymentHighlightCandidate) {
    if (!candidate) return undefined;
    const analysisWindowEndsAt = pixAnalysisWindowEnd(candidate.pix);
    const activePix = !candidate.isPaid && candidate.pix && analysisWindowEndsAt && analysisWindowEndsAt.getTime() > Date.now();
    return {
        paymentId: candidate.paymentId.toString(), paymentTitle: candidate.paymentTitle,
        partType: candidate.partType, ...(candidate.installmentNumber === undefined ? {} : { installmentNumber: candidate.installmentNumber }),
        label: candidate.partType === "down-payment" ? "Entrada" : `Parcela ${candidate.installmentNumber}`,
        amountCents: candidate.amountCents, dueDate: candidate.dueDate, isPaid: candidate.isPaid,
        ...(activePix ? { pix: { generatedAt: candidate.pix!.generatedAt, analysisWindowEndsAt } } : {}),
        hasActivePix: Boolean(activePix)
    };
}

function dateOnlyInFinancialTimeZone(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: FINANCIAL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    const value = (type: "year" | "month" | "day") => parts.find(part => part.type === type)!.value;
    return `${value("year")}-${value("month")}-${value("day")}`;
}

function dateOnlyDifference(from: string, to: string): number {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function clientPaymentResponse(payment: ClientPaymentObject) {
    const response = paymentResponse(payment);
    return {
        id: response.id,
        title: response.title,
        totalAmountCents: response.totalAmountCents,
        installmentCount: response.installmentCount,
        firstDueDate: response.firstDueDate,
        downPaymentPercentage: response.downPaymentPercentage,
        discountPercentage: response.discountPercentage,
        interestPercentage: response.interestPercentage,
        discountAmountCents: response.discountAmountCents,
        downPayment: publicPaymentPart(response.downPayment),
        finalAmountCents: response.finalAmountCents,
        paidAmountCents: response.paidAmountCents,
        remainingAmountCents: response.remainingAmountCents,
        installments: response.installments.map(item => ({ number: item.number, ...publicPaymentPart(item) })),
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
    };
}

function publicPaymentPart(part: PaymentPart) {
    const analysisWindowEndsAt = part.pix ? pixAnalysisWindowEnd(part.pix) : undefined;
    const hasActivePix = !part.isPaid && part.pix && analysisWindowEndsAt
        && analysisWindowEndsAt.getTime() > Date.now();
    return {
        amountCents: part.amountCents,
        isPaid: part.isPaid,
        status: chargePartStatus(part),
        dueDate: part.dueDate,
        ...(hasActivePix ? { pix: { generatedAt: part.pix!.generatedAt, analysisWindowEndsAt } } : {})
    };
}

function responsePaymentPart(part: PaymentPart) {
    return {
        amountCents: part.amountCents,
        isPaid: part.isPaid,
        status: chargePartStatus(part),
        dueDate: part.dueDate,
        ...(part.paidAt ? { paidAt: part.paidAt } : {}),
        ...(part.settlementSource ? { settlementSource: part.settlementSource } : {}),
        ...(part.pix ? { pix: part.pix } : {})
    };
}

function statusAfterChange(
    payment: ClientPaymentObject,
    partType: "down-payment" | "installment",
    installmentNumber: number | undefined,
    isPaid: boolean
) {
    const parts = [payment.downPayment, ...payment.installments].map(part => ({ ...part }));
    const index = partType === "down-payment"
        ? 0
        : payment.installments.findIndex(item => item.number === installmentNumber) + 1;
    parts[index].isPaid = isPaid;
    return chargeStatus(parts);
}

function legacyReceiptId(paymentId: string, partType: "down-payment" | "installment", installmentNumber?: number): string {
    return `legacy:${paymentId}:${partType}:${installmentNumber ?? 0}`;
}

async function pixQrCode(brCode: string): Promise<string> {
    return QRCode.toDataURL(brCode, { errorCorrectionLevel: "M", margin: 2, width: 320 });
}

function pixResponse(
    payment: ClientPaymentObject,
    partType: "down-payment" | "installment",
    installmentNumber: number | undefined,
    part: PaymentPart,
    qrCodeDataUrl: string
) {
    return {
        payment: clientPaymentResponse(payment),
        pix: {
            partType,
            ...(installmentNumber === undefined ? {} : { installmentNumber }),
            amountCents: part.amountCents,
            brCode: part.pix!.brCode,
            qrCodeDataUrl,
            generatedAt: part.pix!.generatedAt,
            analysisWindowEndsAt: pixAnalysisWindowEnd(part.pix!)!
        }
    };
}

function pixAnalysisWindowEnd(pix: PaymentPart["pix"]): Date | undefined {
    return pix?.analysisWindowEndsAt ?? pix?.expiresAt;
}

function conflictError(): ApplicationError {
    return new ApplicationError("Este pagamento foi alterado em outra sessão. Atualize a página e tente novamente", 409);
}

function termsSnapshot(title: string, payment: PaymentSchedule | ClientPaymentObject): PaymentTermsSnapshot {
    return {
        title,
        totalAmountCents: payment.totalAmountCents,
        installmentCount: payment.installmentCount,
        firstDueDate: payment.firstDueDate,
        downPaymentPercentage: payment.downPaymentPercentage,
        discountPercentage: payment.discountPercentage,
        interestPercentage: payment.interestPercentage,
        downPaymentIsPaid: payment.downPayment.isPaid,
        paidInstallmentNumbers: payment.installments.filter(item => item.isPaid).map(item => item.number)
    };
}

function auditEvent(
    type: PaymentAuditEvent["type"],
    actor: PaymentActor,
    details: Omit<PaymentAuditEvent, "eventId" | "type" | "actorId" | "actorSessionId" | "actorRole" | "occurredAt">
): PaymentAuditEvent {
    return {
        eventId: randomUUID(),
        type,
        actorId: actor.id,
        actorSessionId: actor.sessionId,
        actorRole: actor.role,
        occurredAt: new Date(),
        ...details
    };
}
