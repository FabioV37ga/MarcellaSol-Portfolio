export interface BriefingAnswer {
    key?: string;
    question?: string;
    value?: unknown;
}

export interface BriefingSection {
    key?: string;
    title?: string;
    answers?: BriefingAnswer[];
}

export interface BriefingRoom {
    type?: string;
    subtype?: string;
    name?: string;
    sections?: BriefingSection[];
}

export interface BriefingReportDocument {
    briefingDefinition?: {
        user?: { name?: string };
        description?: {
            category?: string;
            type?: string;
            name?: string;
            adultAmount?: number;
            childrenAmount?: number;
            residentAmount?: number;
        };
    };
    responses?: {
        project?: {
            category?: string;
            type?: string;
            name?: string;
            adultAmount?: number;
            childrenAmount?: number;
            residentAmount?: number;
        };
        sections?: BriefingSection[];
        rooms?: BriefingRoom[];
        submittedAt?: string;
    };
    submittedAt?: string | Date | { $date?: string };
}

export interface BriefingReportViewModel {
    clientName: string;
    project: {
        category?: string;
        type?: string;
        name?: string;
        adultAmount?: number;
        childrenAmount?: number;
    };
    sections: BriefingSection[];
    rooms: BriefingRoom[];
    submittedAt?: string;
}

function finiteCount(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
}

function submittedAtValue(value: BriefingReportDocument["submittedAt"]): string | undefined {
    if (typeof value === "string") return value;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
    return value && typeof value === "object" && typeof value.$date === "string"
        ? value.$date
        : undefined;
}

export function mapBriefingReport(document: BriefingReportDocument): BriefingReportViewModel {
    const sourceProject = document.responses?.project ?? document.briefingDefinition?.description ?? {};
    const legacyResidentAmount = finiteCount(sourceProject.residentAmount);
    const adultAmount = finiteCount(sourceProject.adultAmount) ?? legacyResidentAmount;
    const childrenAmount = finiteCount(sourceProject.childrenAmount)
        ?? (legacyResidentAmount === undefined ? undefined : 0);

    return {
        clientName: typeof document.briefingDefinition?.user?.name === "string"
            && document.briefingDefinition.user.name.trim()
            ? document.briefingDefinition.user.name
            : "Cliente",
        project: {
            category: typeof sourceProject.category === "string" ? sourceProject.category : undefined,
            type: typeof sourceProject.type === "string" ? sourceProject.type : undefined,
            name: typeof sourceProject.name === "string" ? sourceProject.name : undefined,
            adultAmount,
            childrenAmount
        },
        sections: Array.isArray(document.responses?.sections) ? document.responses.sections : [],
        rooms: Array.isArray(document.responses?.rooms) ? document.responses.rooms : [],
        submittedAt: document.responses?.submittedAt ?? submittedAtValue(document.submittedAt)
    };
}
