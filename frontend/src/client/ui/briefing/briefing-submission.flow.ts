import type { BriefingAttachment, SubmitBriefingCommand } from "../../infrastructure/briefing/briefing.api.js";
import type { BriefingDescription } from "@/shared/briefing/briefing.types.js";
import {
    briefingFileUploadId,
    isBriefingFieldLogicallyDisabled,
    type CompletedBriefing
} from "./briefing-answer-collector.js";

type BriefingField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface BriefingSubmitter {
    submit(command: SubmitBriefingCommand): Promise<void>;
}

interface BriefingDraftCleaner {
    remove(): void;
}

interface BriefingFileDrafts {
    waitUntilReady(): Promise<void>;
    getFiles(page: HTMLElement, fieldIndex: number, field: HTMLInputElement): File[];
    clear(template: HTMLElement): Promise<void>;
}

interface BriefingAnswers {
    collect(pages: HTMLElement[], project: BriefingDescription): CompletedBriefing;
}

export interface BriefingSubmissionInput {
    token: string;
    pages: HTMLElement[];
    template: HTMLElement;
    project: BriefingDescription;
}

export class BriefingSubmissionFlow {
    constructor(
        private readonly api: BriefingSubmitter,
        private readonly drafts: BriefingDraftCleaner,
        private readonly fileDrafts: BriefingFileDrafts,
        private readonly answers: BriefingAnswers
    ) { }

    buildCompletedBriefing(pages: HTMLElement[], project: BriefingDescription): CompletedBriefing {
        return this.answers.collect(pages, project);
    }

    async submit(input: BriefingSubmissionInput): Promise<void> {
        await this.fileDrafts.waitUntilReady();
        const briefing = this.buildCompletedBriefing(input.pages, input.project);
        const attachments = this.collectAttachments(input.pages);

        await this.api.submit({ token: input.token, briefing, attachments });
        this.drafts.remove();
        await this.fileDrafts.clear(input.template);
    }

    private collectAttachments(pages: HTMLElement[]): BriefingAttachment[] {
        const attachments: BriefingAttachment[] = [];

        pages.forEach(page => {
            const fields = Array.from(page.querySelectorAll<BriefingField>("input, select, textarea"));
            const pageKey = page.dataset.briefingPageKey ?? page.className;

            fields.forEach((field, fieldIndex) => {
                if (!(field instanceof HTMLInputElement)
                    || field.type !== "file"
                    || isBriefingFieldLogicallyDisabled(field)) return;

                const answerKey = field.name || field.id || `field-${fieldIndex + 1}`;
                this.fileDrafts.getFiles(page, fieldIndex, field).forEach((file, fileIndex) => {
                    attachments.push({
                        file,
                        manifest: {
                            uploadId: briefingFileUploadId(page, answerKey, fileIndex),
                            pageKey,
                            answerKey,
                            fileIndex,
                            originalName: file.name
                        }
                    });
                });
            });
        });

        return attachments;
    }
}
