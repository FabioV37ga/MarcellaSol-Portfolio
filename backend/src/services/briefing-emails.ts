const residentEmailKey = /^resident-\d+-mail$/i;

function normalizeEmail(value: string): string | undefined {
    const email = value.trim().toLowerCase();
    if (email.length === 0 || email.length > 254) return undefined;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
    return email;
}

export function extractResidentEmails(briefing: unknown): string[] {
    const emails = new Set<string>();

    const visit = (value: unknown): void => {
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (!value || typeof value !== "object") return;

        const record = value as Record<string, unknown>;
        if (typeof record.key === "string" && residentEmailKey.test(record.key)
            && typeof record.value === "string") {
            const email = normalizeEmail(record.value);
            if (email) emails.add(email);
        }

        Object.values(record).forEach(visit);
    };

    visit(briefing);
    return [...emails];
}

export function maskedEmail(email: string): string {
    const [local = "", domain = ""] = email.split("@");
    const visibleLocal = local.slice(0, Math.min(2, local.length));
    return `${visibleLocal}${"*".repeat(Math.max(1, local.length - visibleLocal.length))}@${domain}`;
}
