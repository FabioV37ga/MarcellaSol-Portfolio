import mongoose from "mongoose";
import type { ClientPaymentObject } from "../../models/clientPayment.js";
import { FINANCIAL_TIME_ZONE } from "../../domain/financial-domain.js";
import { ApplicationError } from "../errors/application-error.js";
import type {
    PaymentHighlightCandidate,
    PaymentHighlightCandidates,
    PaymentListingRepository,
    PaymentSummary
} from "../ports/payment-listing.repository.js";
import { pixAnalysisWindowEnd } from "./payment-presenter.js";

const DEFAULT_PAYMENT_PAGE_SIZE = 20;
const MAX_PAYMENT_PAGE_SIZE = 100;

export function paymentPageOptions(cursorValue: unknown, limitValue: unknown) {
    const parsedLimit = typeof limitValue === "string" && /^\d+$/.test(limitValue)
        ? Number(limitValue) : DEFAULT_PAYMENT_PAGE_SIZE;
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

export function paymentPageResponse<T>(
    page: { records: ClientPaymentObject[]; hasMore: boolean },
    summary: PaymentSummary,
    highlight: ReturnType<typeof paymentHighlightResponse> | undefined,
    limit: number,
    presenter: (payment: ClientPaymentObject) => T
) {
    const last = page.records[page.records.length - 1];
    const nextCursor = page.hasMore && last
        ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last._id.toString() })).toString("base64url")
        : undefined;
    return {
        payments: page.records.map(presenter), page: {
            limit, hasMore: page.hasMore,
            ...(nextCursor ? { nextCursor } : {})
        }, summary, highlight
    };
}

export async function loadPaymentPage(
    repository: PaymentListingRepository,
    clientId: string,
    options: ReturnType<typeof paymentPageOptions>,
    now = new Date()
) {
    const today = dateOnlyInFinancialTimeZone(now);
    const monthStart = `${today.slice(0, 8)}01`;
    const [year, month] = today.split("-").map(Number);
    const nextMonthStart = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`;
    const [page, summary, candidates] = await Promise.all([
        repository.findPageByClientId(clientId, options),
        repository.summarizeByClientId(clientId),
        repository.findHighlightCandidatesByClientId(clientId, today, monthStart, nextMonthStart)
    ]);
    return { page, summary, highlight: selectPaymentHighlight(candidates, today, now) };
}

export function selectPaymentHighlight(candidates: PaymentHighlightCandidates, today: string, now = new Date()) {
    const nextWithinWindow = candidates.nextUnpaid
        && dateOnlyDifference(today, candidates.nextUnpaid.dueDate) <= 28
        ? candidates.nextUnpaid : undefined;
    return paymentHighlightResponse(candidates.overdue
        ?? candidates.currentUnpaid
        ?? nextWithinWindow
        ?? candidates.currentLast
        ?? candidates.latestPast, now);
}

function paymentHighlightResponse(candidate: PaymentHighlightCandidate | undefined, now = new Date()) {
    if (!candidate) return undefined;
    const analysisWindowEndsAt = pixAnalysisWindowEnd(candidate.pix);
    const activePix = !candidate.isPaid && candidate.pix && analysisWindowEndsAt
        && analysisWindowEndsAt.getTime() > now.getTime();
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
