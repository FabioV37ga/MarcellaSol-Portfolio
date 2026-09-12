import { BriefingApi, type BriefingAttachment } from "../infrastructure/briefing/briefing.api.js";
import { BriefingDraftRepository } from "../infrastructure/briefing/briefing-draft.repository.js";
import { BriefingFileRepository } from "../infrastructure/briefing/briefing-file.repository.js";
import { BriefingFormRules } from "../ui/briefing/briefing-form-rules.js";
import { BriefingNavigator, type BriefingHistoryOptions } from "../ui/briefing/briefing-navigator.js";
import { BriefingDraftService } from "../ui/briefing/briefing-draft.service.js";
import { BriefingFileDraftService } from "../ui/briefing/briefing-file-draft.service.js";
import {
    BriefingAnswerCollector,
    briefingFileUploadId,
    isBriefingFieldLogicallyDisabled,
    type CompletedBriefing
} from "../ui/briefing/briefing-answer-collector.js";
import type {
    BriefingRoom,
    ClientBriefingResponse,
    ClientSummary,
    ResolvedBriefingDefinition
} from "@/shared/briefing/briefing.types.js";
import { about_1, about_2 } from "../templates/briefing/about.template.js";
import { ambient } from "../templates/briefing/ambient.template.js";
import { balcony } from "../templates/briefing/balcony.template.js";
import { bathroom } from "../templates/briefing/bathroom.template.js";
import { bedroom } from "../templates/briefing/bedroom.template.js";
import { briefingTemplate } from "../templates/briefing/briefing.template.js";
import { diningRoom } from "../templates/briefing/diningRoom.template.js";
import { ending } from "../templates/briefing/ending.template.js";
import { existing } from "../templates/briefing/existing.template.js";
import { home } from "../templates/briefing/home.template.js";
import { investment } from "../templates/briefing/investment.template.js";
import { kitchen } from "../templates/briefing/kitchen.template.js";
import { laundry } from "../templates/briefing/laundry.template.js";
import { livingRoom } from "../templates/briefing/livingRoom.template.js";
import { preferences_1, preferences_2, preferences_3 } from "../templates/briefing/preferences.template.js";
import { routine } from "../templates/briefing/routine.template.js";
import { toilet } from "../templates/briefing/toilet.template.js";

const roomLabels: Record<string, string> = {
    "sala-estar": "Sala de estar",
    "sala-jantar": "Sala de jantar",
    cozinha: "Cozinha",
    varanda: "Varanda",
    lavanderia: "Área de serviço",
    quarto: "Quarto",
    banheiro: "Banheiro",
    lavabo: "Lavabo"
};

function normalizeRoom(room: Partial<BriefingRoom>, position: number): BriefingRoom {
    return {
        id: Number.isFinite(Number(room.id)) ? Number(room.id) : position,
        index: Number.isFinite(Number(room.index)) ? Number(room.index) : position,
        name: typeof room.name === "string" ? room.name.trim() : "",
        type: typeof room.type === "string" ? room.type.trim().toLowerCase() : "",
        subtype: typeof room.subtype === "string" ? room.subtype : undefined,
        options: Array.isArray(room.options) ? room.options.map(Boolean) : []
    };
}

export function normalizeBriefingData(
    response: ClientBriefingResponse,
    fallbackName: string
): { clientObject: ClientSummary; briefingObject: ResolvedBriefingDefinition } {
    const rawBriefing = response.briefingObject ?? {};
    const description = rawBriefing.description ?? {} as ResolvedBriefingDefinition["description"];
    const rooms = Array.isArray(rawBriefing.rooms)
        ? rawBriefing.rooms.map(normalizeRoom).sort((a, b) => a.index - b.index)
        : [];

    return {
        clientObject: {
            id: typeof response.clientObject?.id === "string" ? response.clientObject.id : undefined,
            name: response.clientObject?.name?.trim() || rawBriefing.user?.name?.trim() || fallbackName,
            hasFilledBriefing: Boolean(response.clientObject?.hasFilledBriefing)
        },
        briefingObject: {
            id: typeof rawBriefing.id === "string" ? rawBriefing.id : undefined,
            user: { name: rawBriefing.user?.name?.trim() || fallbackName },
            description: {
                category: typeof description.category === "string" ? description.category : "",
                type: typeof description.type === "string" ? description.type : "",
                name: typeof description.name === "string" ? description.name : "",
                residentAmount: Math.max(0, Number(description.residentAmount) || 0)
            },
            investmentFlexibility: Boolean(rawBriefing.investmentFlexibility),
            rooms
        }
    };
}

function roomPage(room: BriefingRoom, residents: number): HTMLElement | undefined {
    const option = (index: number, fallback = true) => room.options[index] ?? fallback;

    switch (room.type) {
        case "sala-estar": return livingRoom();
        case "sala-jantar": return diningRoom();
        case "cozinha": return kitchen(residents, option(0));
        case "varanda": return balcony(option(0));
        case "lavanderia": return laundry();
        case "quarto": return bedroom(
            option(0), option(1), room.options.slice(2, 10).some(value => value) || room.options.length < 3,
            option(2), option(3), option(4), option(5), option(6), option(7), option(8), option(9),
            option(10), option(11), option(12), option(13)
        );
        case "banheiro": return bathroom();
        case "lavabo": return toilet();
        default: return undefined;
    }
}

function considerationPage(roomType: string): HTMLElement | undefined {
    switch (roomType) {
        case "cozinha": return existing.existingKitchen();
        case "lavanderia": return existing.existingLaundry();
        case "sala-estar": return existing.existingLivingRoom();
        case "varanda": return existing.existingGourmetBalcony();
        case "quarto": return existing.existingDormitories();
        default: return undefined;
    }
}

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
        const generatedPages = this.createPages();
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

    private createPages(): HTMLElement[] {
        const rooms = this.briefing.rooms;
        const residents = this.briefing.description.residentAmount;
        const configuredRoomPages = rooms.reduce<HTMLElement[]>((pages, room) => {
            const environmentPage = roomPage(room, residents);
            const itemsPage = considerationPage(room.type);

            if (environmentPage) {
                pages.push(this.identifyPage(environmentPage, `room-${room.id}`, room, "environment"));
            }
            if (itemsPage) {
                pages.push(this.identifyPage(
                    itemsPage,
                    `room-${room.id}-considerations`,
                    room,
                    "considerations"
                ));
            }
            return pages;
        }, []);

        const fixedPages = [
            ["welcome", home()],
            ["about-property", about_1(residents, true)],
            ["about-residents", about_2()],
            ["routine", routine()],
            ["investment", investment(this.briefing.investmentFlexibility)],
            ["preferences-atmosphere", preferences_1()],
            ["preferences-colors", preferences_2()],
            ["preferences-materials", preferences_3()],
            ["environments-overview", ambient(
                rooms.map(room => room.name || roomLabels[room.type] || room.type),
                residents
            )]
        ] as Array<[string, HTMLElement]>;
        const identifiedFixedPages = fixedPages.map(([key, page]) => this.identifyPage(page, key));

        const furniturePage = this.identifyPage(existing.existingFurniture(), "existing-furniture");
        const endingPage = this.identifyPage(ending(), "ending");

        return [
            ...identifiedFixedPages,
            ...configuredRoomPages,
            furniturePage,
            endingPage
        ];
    }

    private identifyPage(
        page: HTMLElement,
        key: string,
        room?: BriefingRoom,
        kind?: "environment" | "considerations"
    ): HTMLElement {
        let pageElement = page;

        if (!(page instanceof HTMLElement)) {
            const fragment = page as unknown as DocumentFragment;
            const elementChildren = Array.from(fragment.children ?? []);

            if (elementChildren.length === 1) {
                pageElement = elementChildren[0] as HTMLElement;
            } else {
                pageElement = document.createElement("div");
                pageElement.className = "briefing-generated-page";
                pageElement.append(fragment);
            }

            console.warn(`Briefing: o template "${key}" retornou múltiplas raízes e foi normalizado.`);
        }

        pageElement.dataset.briefingPageKey = key;
        if (!room) return pageElement;

        pageElement.dataset.briefingRoomId = String(room.id);
        pageElement.dataset.briefingRoomIndex = String(room.index);
        pageElement.dataset.briefingRoomName = room.name;
        pageElement.dataset.briefingRoomType = room.type;
        pageElement.dataset.briefingRoomSubtype = room.subtype ?? "";
        pageElement.dataset.briefingRoomPageKind = kind ?? "environment";

        if (room.name) {
            const title = pageElement.querySelector<HTMLElement>(".briefing-title");
            if (title) title.textContent = room.name;
        }

        return pageElement;
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
                this.clearDraft();
                await this.fileDraftService.clear(this.template);
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

    private clearDraft(): void {
        this.draftService.remove();
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
        return this.answerCollector.collect(this.pages, this.briefing.description);
    }

    private async submitBriefing(): Promise<void> {
        await this.fileDraftService.waitUntilReady();
        const attachments: BriefingAttachment[] = [];

        this.pages.forEach(page => {
            const fields = Array.from(page.querySelectorAll<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >("input, select, textarea"));
            const pageKey = page.dataset.briefingPageKey ?? page.className;

            fields.forEach((field, fieldIndex) => {
                if (!(field instanceof HTMLInputElement) || field.type !== "file" || isBriefingFieldLogicallyDisabled(field)) return;

                const answerKey = field.name || field.id || `field-${fieldIndex + 1}`;
                this.fileDraftService.getFiles(page, fieldIndex, field).forEach((file, fileIndex) => {
                    const uploadId = briefingFileUploadId(page, answerKey, fileIndex);
                    attachments.push({
                        file,
                        manifest: { uploadId, pageKey, answerKey, fileIndex, originalName: file.name }
                    });
                });
            });
        });

        await this.briefingApi.submit({
            token: this.sessionToken,
            briefing: this.buildCompletedBriefing(),
            attachments
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
