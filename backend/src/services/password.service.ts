import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PREFIX = "scrypt";

export class PasswordService {
    isHash(value: string): boolean {
        return value.startsWith(`${PREFIX}$`);
    }

    async hash(password: string): Promise<string> {
        const salt = randomBytes(16).toString("hex");
        const derived = await scrypt(password, salt, 64) as Buffer;
        return `${PREFIX}$${salt}$${derived.toString("hex")}`;
    }

    async verify(password: string, storedValue: string): Promise<boolean> {
        if (!this.isHash(storedValue)) return this.safeTextComparison(password, storedValue);

        const [, salt, expectedHex] = storedValue.split("$");
        if (!salt || !expectedHex) return false;
        const expected = Buffer.from(expectedHex, "hex");
        const derived = await scrypt(password, salt, expected.length) as Buffer;
        return expected.length === derived.length && timingSafeEqual(expected, derived);
    }

    private safeTextComparison(left: string, right: string): boolean {
        const leftBuffer = Buffer.from(left);
        const rightBuffer = Buffer.from(right);
        return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
    }
}
