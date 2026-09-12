import type { ResolvedBriefingDefinition } from "@/shared/briefing/briefing.types.js";

type BriefingField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface BriefingAnswer {
    key: string;
    question: string;
    controlType: string;
    value: string | number | boolean | string[] | Array<{
        name: string;
        size: number;
        type: string;
        uploadId: string;
    }>;
}

export interface BriefingAnswerSection {
    key: string;
    title: string;
    answers: BriefingAnswer[];
}

export interface BriefingRoomAnswers {
    id: number;
    index: number;
    name: string;
    type: string;
    subtype?: string;
    sections: BriefingAnswerSection[];
}

export interface CompletedBriefing {
    version: 1;
    project: ResolvedBriefingDefinition["description"];
    sections: BriefingAnswerSection[];
    rooms: BriefingRoomAnswers[];
    submittedAt: string;
}

export interface BriefingFileSource {
    getFiles(page: HTMLElement, fieldIndex: number, field: HTMLInputElement): File[];
}

export class BriefingAnswerCollector {
    constructor(private readonly fileSource: BriefingFileSource) { }

    collect(
        pages: HTMLElement[],
        project: ResolvedBriefingDefinition["description"],
        submittedAt = new Date()
    ): CompletedBriefing {
        const sections: BriefingAnswerSection[] = [];
        const roomsById = new Map<string, BriefingRoomAnswers>();

        pages.forEach(page => {
            const section = this.captureSection(page);
            const roomId = page.dataset.briefingRoomId;

            if (!roomId) {
                sections.push(section);
                return;
            }

            let roomAnswers = roomsById.get(roomId);
            if (!roomAnswers) {
                roomAnswers = {
                    id: Number(roomId),
                    index: Number(page.dataset.briefingRoomIndex) || 0,
                    name: page.dataset.briefingRoomName ?? "",
                    type: page.dataset.briefingRoomType ?? "",
                    subtype: page.dataset.briefingRoomSubtype || undefined,
                    sections: []
                };
                roomsById.set(roomId, roomAnswers);
            }
            roomAnswers.sections.push(section);
        });

        return {
            version: 1,
            project: { ...project },
            sections,
            rooms: Array.from(roomsById.values()).sort((left, right) => left.index - right.index),
            submittedAt: submittedAt.toISOString()
        };
    }

    private captureSection(page: HTMLElement): BriefingAnswerSection {
        const fields = Array.from(page.querySelectorAll<BriefingField>("input, select, textarea"));
        const processedGroups = new Set<string>();
        const answers: BriefingAnswer[] = [];

        fields.forEach((field, fieldIndex) => {
            if (isBriefingFieldLogicallyDisabled(field) || field.closest(".briefing-navigation")) return;

            const type = field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase();
            const key = field.name || field.id || `field-${fieldIndex + 1}`;
            const groupKey = `${type}:${key}`;

            if ((type === "radio" || type === "checkbox") && processedGroups.has(groupKey)) return;
            if (type === "radio" || type === "checkbox") {
                processedGroups.add(groupKey);
                const group = fields.filter(candidate =>
                    candidate instanceof HTMLInputElement
                    && candidate.type === type
                    && (candidate.name || candidate.id || `field-${fields.indexOf(candidate) + 1}`) === key
                    && !isBriefingFieldLogicallyDisabled(candidate)
                ) as HTMLInputElement[];
                const selectedValues = group.filter(candidate => candidate.checked).map(candidate => candidate.value);
                answers.push({
                    key,
                    question: questionFor(field),
                    controlType: type,
                    value: type === "radio" ? (selectedValues[0] ?? "") : selectedValues
                });
                return;
            }

            if (field instanceof HTMLInputElement && field.type === "file") {
                const files = this.fileSource.getFiles(page, fieldIndex, field);
                answers.push({
                    key,
                    question: questionFor(field),
                    controlType: "file",
                    value: files.map((file, fileIndex) => ({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        uploadId: briefingFileUploadId(page, key, fileIndex)
                    }))
                });
                return;
            }

            const value = field instanceof HTMLSelectElement && field.multiple
                ? Array.from(field.selectedOptions).map(option => option.value)
                : field instanceof HTMLInputElement && field.type === "number"
                    ? Number(field.value)
                    : field.value;
            answers.push({ key, question: questionFor(field), controlType: type, value });
        });

        return {
            key: page.dataset.briefingPageKey ?? page.className,
            title: page.querySelector<HTMLElement>(".briefing-title")?.textContent?.trim() ?? "",
            answers
        };
    }
}

export function isBriefingFieldLogicallyDisabled(field: BriefingField): boolean {
    const disabledBeforePageWasHidden = field.dataset.briefingDisabledBeforeHide;
    return disabledBeforePageWasHidden === undefined
        ? field.disabled
        : disabledBeforePageWasHidden === "true";
}

export function briefingFileUploadId(page: HTMLElement, answerKey: string, fileIndex: number): string {
    const pageKey = page.dataset.briefingPageKey ?? page.className;
    const roomKey = page.dataset.briefingRoomId ? `room-${page.dataset.briefingRoomId}` : "global";
    return `${roomKey}:${pageKey}:${answerKey}:${fileIndex}`;
}

function questionFor(field: BriefingField): string {
    const container = field.closest<HTMLElement>(".briefing-input-box, fieldset");
    const heading = container?.querySelector<HTMLElement>(
        ":scope > legend, :scope > p, :scope > label:not(.briefing-ignore-option)"
    );
    return heading?.textContent?.trim()
        || field.labels?.[0]?.textContent?.trim()
        || field.name
        || field.id
        || "Campo sem título";
}
