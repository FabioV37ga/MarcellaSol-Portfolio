const GUI = "BR.GOV.BCB.PIX";

export interface PixReceiver {
    key: string;
    name: string;
    city: string;
}

export function generatePixBrCode(amountCents: number, txid: string, receiver: PixReceiver): string {
    if (!Number.isSafeInteger(amountCents) || amountCents < 1) throw new Error("Invalid Pix amount");
    if (!/^[A-Za-z0-9]{1,25}$/.test(txid)) throw new Error("Invalid Pix txid");
    const key = receiver.key.trim();
    if (!key || key.length > 77) throw new Error("Invalid Pix key");

    const merchantAccount = tlv("00", GUI) + tlv("01", key);
    const additionalData = tlv("05", txid);
    const payloadWithoutCrc = [
        tlv("00", "01"),
        tlv("26", merchantAccount),
        tlv("52", "0000"),
        tlv("53", "986"),
        tlv("54", money(amountCents)),
        tlv("58", "BR"),
        tlv("59", normalizeText(receiver.name, 25)),
        tlv("60", normalizeText(receiver.city, 15)),
        tlv("62", additionalData),
        "6304"
    ].join("");
    return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}

export function crc16(value: string): string {
    let crc = 0xffff;
    for (const byte of Buffer.from(value, "utf8")) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
    const length = Buffer.byteLength(value, "utf8");
    if (length > 99) throw new Error("Pix field is too long");
    return `${id}${String(length).padStart(2, "0")}${value}`;
}

function money(amountCents: number): string {
    return `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`;
}

function normalizeText(value: string, maximumLength: number): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 $%*+\-./:]/g, " ").trim().slice(0, maximumLength);
}
