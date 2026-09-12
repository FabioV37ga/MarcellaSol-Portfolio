import { BriefingApi } from "../infrastructure/briefing/briefing.api.js";
import { BriefingDraftRepository } from "../infrastructure/briefing/briefing-draft.repository.js";
import { BriefingFileRepository } from "../infrastructure/briefing/briefing-file.repository.js";
import { BriefingFormRules } from "../ui/briefing/briefing-form-rules.js";
import { BriefingNavigator, type BriefingHistoryOptions } from "../ui/briefing/briefing-navigator.js";
import { BriefingDraftService } from "../ui/briefing/briefing-draft.service.js";
import { BriefingFileDraftService } from "../ui/briefing/briefing-file-draft.service.js";
import { BriefingSubmissionFlow } from "../ui/briefing/briefing-submission.flow.js";
import { BriefingPageFactory } from "../ui/briefing/briefing-page.factory.js";
import {
    BriefingAnswerCollector,
    type CompletedBriefing
} from "../ui/briefing/briefing-answer-collector.js";
import type {
    ClientSummary,
    ResolvedBriefingDefinition
} from "@/shared/briefing/briefing.types.js";
import { briefingTemplate } from "../templates/briefing/briefing.template.js";

export type { CompletedBriefing } from "../ui/briefing/briefing-answer-collector.js";

export default class ClientBriefingController {
    private readonly pages: HTMLElement[];
    private readonly template: HTMLElement;
    private navigationBound = false;
    private readonly draftStorageKey: string;
    private readonly draftService: BriefingDraftService;
    private readonly fileDraftService: BriefingFileDraftService;
    private readonly answerCollector: BriefingAnswerCollector;
    private readonly briefingApi = new BriefingApi();
    private readonly submissionFlow: BriefingSubmissionFlow;
    private readonly formRules: BriefingFormRules;
    private readonly navigator: BriefingNavigator;

    constructor(
        readonly client: ClientSummary,
        readonly briefing: ResolvedBriefingDefinition,
        private readonly sessionToken: string
    ) {
        const ownerKey = briefing.id || client.id || client.name;
        this.draftStorageKey = `client-briefing-draft:v1:${ownerKey}`;
        this.draftService = new BriefingDraftService(new BriefingDraftRepository(this.draftStorageKey));
        this.fileDraftService = new BriefingFileDraftService(this.draftStorageKey, new BriefingFileRepository());
        this.answerCollector = new BriefingAnswerCollector(this.fileDraftService);
        this.submissionFlow = new BriefingSubmissionFlow(
            this.briefingApi,
            this.draftService,
            this.fileDraftService,
            this.answerCollector
        );
        const generatedPages = new BriefingPageFactory().create(this.briefing);
        this.template = briefingTemplate(generatedPages);
        this.pages = Array.from(
            this.template.querySelectorAll<HTMLElement>(".form-page-container > div")
        );
        this.formRules = new BriefingFormRules(this.template);
        this.navigator = new BriefingNavigator(this.template, this.pages, {
            onPageShown: page => this.formRules.preparePage(page),
            onPageChanged: () => this.saveDraft()
        });

        if (this.pages.length !== generatedPages.length) {
            console.error("Briefing: nem todos os templates geraram uma página HTML válida.", {
                expected: generatedPages.length,
                rendered: this.pages.length
            });
        }
    }

    getTemplate(): HTMLElement {
        return this.template;
    }

    initialize(): void {
        this.ensureStylesheet();
        if (!this.navigationBound) {
            this.bindNavigation();
            this.navigationBound = true;
        }

        const restoredPage = this.restoreDraft();
        this.showPage(restoredPage, { replaceHistory: true });
        this.fileDraftService.initialize(this.pages);
    }

    navigateToStep(index: number): void {
        this.showPage(index, { pushHistory: false });
    }

    private showPage(
        index: number,
        historyOptions: BriefingHistoryOptions = {}
    ): void {
        this.navigator.show(index, historyOptions);
    }

    private bindNavigation(): void {
        this.template.addEventListener("input", (event: Event) => {
            if (this.draftService.isCacheableField(event.target)) this.saveDraft();
        });

        this.template.addEventListener("change", (event: Event) => {
            const field = event.target as HTMLInputElement;

            if (field instanceof HTMLInputElement && field.type === "file") {
                void this.fileDraftService.save(field, this.pages);
            }

            this.formRules.handleChange(field, this.pages[this.navigator.currentPage]);

            if (this.draftService.isCacheableField(field)) this.saveDraft();
        });

        this.template.addEventListener("click", async (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const control = target.closest<HTMLElement>(".briefing-navigation a, .briefing-navigation button");
            const navigation = control?.closest<HTMLElement>(".briefing-navigation");

            if (!control || !navigation) return;

            event.preventDefault();

            const controls = Array.from(navigation.querySelectorAll<HTMLElement>("a, button"));
            const isBackControl = this.navigator.currentPage > 0 && control === controls[0];

            if (isBackControl) {
                this.navigator.back();
                return;
            }

            console.info(`Briefing: continuar da etapa ${this.navigator.currentPage + 1}`);

            const page = this.pages[this.navigator.currentPage];
            const form = this.template.querySelector<HTMLFormElement>(".form-page-container");
            if (!this.formRules.validatePage(page, form ?? undefined)) return;

            if (this.navigator.currentPage < this.pages.length - 1) {
                this.showPage(this.navigator.currentPage + 1);
                return;
            }

            const submitButton = control instanceof HTMLButtonElement ? control : undefined;

            try {
                if (submitButton) {
                    submitButton.disabled = true;
                }

                this.setSubmissionState(page, "loading");
                await this.submitBriefing();
                this.setSubmissionState(page, "success");
            } catch (error) {
                console.error("Briefing: falha ao enviar respostas.", error);
                this.setSubmissionState(page, "idle");
                window.alert(error instanceof Error ? error.message : "Não foi possível enviar o briefing.");

                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }

    private saveDraft(): void {
        this.draftService.save(this.pages, this.navigator.currentPage);
    }

    private restoreDraft(): number {
        return this.draftService.restore(this.pages);
    }

    private setSubmissionState(page: HTMLElement, state: "idle" | "loading" | "success"): void {
        const loadingScreen = page.querySelector<HTMLElement>(".briefing-submission-loading");
        const successScreen = page.querySelector<HTMLElement>(".briefing-success-message");

        page.classList.toggle("is-submitting", state === "loading");
        page.classList.toggle("is-submit-success", state === "success");
        page.setAttribute("aria-busy", String(state === "loading"));

        loadingScreen?.toggleAttribute("hidden", state !== "loading");
        successScreen?.toggleAttribute("hidden", state !== "success");
    }

    public buildCompletedBriefing(): CompletedBriefing {
        return this.submissionFlow.buildCompletedBriefing(this.pages, this.briefing.description);
    }

    private async submitBriefing(): Promise<void> {
        await this.submissionFlow.submit({
            token: this.sessionToken,
            pages: this.pages,
            template: this.template,
            project: this.briefing.description
        });
    }

    private ensureStylesheet(): void {
        // if (document.querySelector('link[data-client-briefing="true"]')) return;

        // const stylesheet = document.createElement("link");
        // stylesheet.rel = "stylesheet";
        // stylesheet.href = "/client/styles/briefing/briefing.css";
        // stylesheet.dataset.clientBriefing = "true";
        // document.head.append(stylesheet);
    }
}
