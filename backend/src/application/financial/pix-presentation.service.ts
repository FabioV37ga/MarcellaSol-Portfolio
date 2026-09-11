import QRCode from "qrcode";
import type { ClientPaymentObject, PaymentPart, PixPaymentRequest } from "../../models/clientPayment.js";
import { generatePixBrCode, type PixReceiver } from "../../services/pix-br-code.js";
import { clientPaymentResponse, pixAnalysisWindowEnd } from "./payment-presenter.js";

const PIX_ANALYSIS_WINDOW_MS = 5 * 60 * 60 * 1000;
const PIX_TXID = "***";

export type PixPartType = "down-payment" | "installment";
export type PixQrCodeGenerator = (brCode: string) => Promise<string>;

export class PixPresentationService {
    constructor(
        private readonly receiver: PixReceiver,
        private readonly generateQrCode: PixQrCodeGenerator = defaultQrCodeGenerator
    ) { }

    createAttempt(amountCents: number, generatedAt = new Date()): PixPaymentRequest {
        return {
            txid: PIX_TXID,
            brCode: generatePixBrCode(amountCents, PIX_TXID, this.receiver),
            generatedAt,
            analysisWindowEndsAt: new Date(generatedAt.getTime() + PIX_ANALYSIS_WINDOW_MS)
        };
    }

    isReusable(pix: PixPaymentRequest | undefined, now = new Date()): boolean {
        const analysisWindowEndsAt = pixAnalysisWindowEnd(pix);
        return Boolean(
            pix
            && pix.txid === PIX_TXID
            && analysisWindowEndsAt
            && analysisWindowEndsAt.getTime() > now.getTime()
        );
    }

    async present(
        payment: ClientPaymentObject,
        partType: PixPartType,
        installmentNumber: number | undefined,
        part: PaymentPart,
        now = new Date()
    ) {
        if (!part.pix) throw new Error("Cannot present a payment part without Pix data");
        const analysisWindowEndsAt = pixAnalysisWindowEnd(part.pix);
        if (!analysisWindowEndsAt) throw new Error("Cannot present Pix data without an analysis window");

        return {
            payment: clientPaymentResponse(payment, now),
            pix: {
                partType,
                ...(installmentNumber === undefined ? {} : { installmentNumber }),
                amountCents: part.amountCents,
                brCode: part.pix.brCode,
                qrCodeDataUrl: await this.generateQrCode(part.pix.brCode),
                generatedAt: part.pix.generatedAt,
                analysisWindowEndsAt
            }
        };
    }
}

function defaultQrCodeGenerator(brCode: string): Promise<string> {
    return QRCode.toDataURL(brCode, { errorCorrectionLevel: "M", margin: 2, width: 320 });
}
