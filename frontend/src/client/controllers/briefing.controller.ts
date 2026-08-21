import { BriefingApi, type BriefingAttachment } from "../infrastructure/briefing/briefing.api.js";
import {
    BriefingDraftRepository,
    type CachedBriefingDraft,
    type CachedBriefingField
} from "../infrastructure/briefing/briefing-draft.repository.js";
import { BriefingFileRepository } from "../infrastructure/briefing/briefing-file.repository.js";
import { BriefingFormRules } from "../ui/briefing/briefing-form-rules.js";
import { BriefingNavigator, type BriefingHistoryOptions } from "../ui/briefing/briefing-navigator.js";
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

interface BriefingAnswer {
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

interface BriefingAnswerSection {
    key: string;
    title: string;
    answers: BriefingAnswer[];
}

interface BriefingRoomAnswers {
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

export default class ClientBriefingController {
    private readonly pages: HTMLElement[];
    private readonly template: HTMLElement;
    private navigationBound = false;
    private readonly draftStorageKey: string;
    private readonly draftRepository: BriefingDraftRepository;
    private readonly fileRepository = new BriefingFileRepository();
    private readonly briefingApi = new BriefingApi();
    private readonly cachedFiles = new Map<string, File[]>();
    private fileCacheReady: Promise<void> = Promise.resolve();
    private readonly formRules: BriefingFormRules;
    private readonly navigator: BriefingNavigator;

    constructor(
        readonly client: ClientSummary,
        readonly briefing: ResolvedBriefingDefinition,
        private readonly sessionToken: string
    ) {
        const ownerKey = briefing.id || client.id || client.name;
        this.draftStorageKey = `client-briefing-draft:v1:${ownerKey}`;
        this.draftRepository = new BriefingDraftRepository(this.draftStorageKey);
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
        this.fileCacheReady = this.restoreFileDrafts();
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
            if (this.isCacheableField(event.target)) this.saveDraft();
        });

        this.template.addEventListener("change", (event: Event) => {
            const field = event.target as HTMLInputElement;

            if (field instanceof HTMLInputElement && field.type === "file") {
                void this.saveFileDraft(field);
            }

            this.formRules.handleChange(field, this.pages[this.navigator.currentPage]);

            if (this.isCacheableField(field)) this.saveDraft();
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
                await this.clearFileDrafts();
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

    private isCacheableField(target: EventTarget | null): target is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
            return false;
        }

        return !(target instanceof HTMLInputElement && (target.type === "file" || target.type === "password"));
    }

    private saveDraft(): void {
        const fields: CachedBriefingField[] = [];

        this.pages.forEach(page => {
            const pageKey = page.dataset.briefingPageKey ?? page.className;
            page.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                "input, select, textarea"
            ).forEach((field, fieldIndex) => {
                if (!this.isCacheableField(field)) return;

                const type = field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase();
                const value = field instanceof HTMLSelectElement && field.multiple
                    ? Array.from(field.selectedOptions).map(option => option.value)
                    : field.value;
                const checked = field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")
                    ? field.checked
                    : undefined;

                fields.push({ pageKey, fieldIndex, type, value, checked });
            });
        });

        const draft: CachedBriefingDraft = { version: 1, currentPage: this.navigator.currentPage, fields };
        this.draftRepository.save(draft);
    }

    private restoreDraft(): number {
        const draft = this.draftRepository.load();
        if (!draft) return 0;

        const pagesByKey = new Map(this.pages.map(page => [page.dataset.briefingPageKey ?? page.className, page]));
        draft.fields.forEach(cachedField => {
            const page = pagesByKey.get(cachedField.pageKey);
            const field = page?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                "input, select, textarea"
            )[cachedField.fieldIndex];
            if (!field || !this.isCacheableField(field)) return;

            const currentType = field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase();
            if (currentType !== cachedField.type) return;

            if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
                field.checked = Boolean(cachedField.checked);
            } else if (field instanceof HTMLSelectElement && field.multiple && Array.isArray(cachedField.value)) {
                const selectedValues = new Set(cachedField.value);
                Array.from(field.options).forEach(option => option.selected = selectedValues.has(option.value));
            } else if (typeof cachedField.value === "string") {
                field.value = cachedField.value;
            }
        });

        return Number.isInteger(draft.currentPage)
            ? Math.min(Math.max(draft.currentPage, 0), this.pages.length - 1)
            : 0;
    }

    private getFileFieldId(page: HTMLElement, fieldIndex: number): string {
        const pageKey = page.dataset.briefingPageKey ?? page.className;
        return `${this.draftStorageKey}:${pageKey}:${fieldIndex}`;
    }

    private getFilesForField(page: HTMLElement, fieldIndex: number, field: HTMLInputElement): File[] {
        const selectedFiles = Array.from(field.files ?? []);
        return selectedFiles.length > 0
            ? selectedFiles
            : this.cachedFiles.get(this.getFileFieldId(page, fieldIndex)) ?? [];
    }

    private async saveFileDraft(field: HTMLInputElement): Promise<void> {
        const page = this.pages.find(candidate => candidate.contains(field));
        if (!page) return;

        const fields = Array.from(page.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            "input, select, textarea"
        ));
        const fieldIndex = fields.indexOf(field);
        if (fieldIndex < 0) return;

        const id = this.getFileFieldId(page, fieldIndex);
        const files = Array.from(field.files ?? []);
        if (files.length > 0) this.cachedFiles.set(id, files);
        else this.cachedFiles.delete(id);
        this.renderCachedFileStatus(field, files);

        const operation = this.fileCacheReady.then(() => this.fileRepository.save(id, files)).catch(error => {
            console.warn("Briefing: não foi possível salvar os arquivos do rascunho.", error);
        });

        this.fileCacheReady = operation;
        await operation;
    }

    private async restoreFileDrafts(): Promise<void> {
        try {
            const fileFields = this.pages.reduce<Array<{
                page: HTMLElement;
                field: HTMLInputElement;
                fieldIndex: number;
            }>>((result, page) => {
                const fields = Array.from(page.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                    "input, select, textarea"
                ));
                fields.forEach((field, fieldIndex) => {
                    if (field instanceof HTMLInputElement && field.type === "file") {
                        result.push({ page, field, fieldIndex });
                    }
                });
                return result;
            }, []);

            await Promise.all(fileFields.map(async ({ page, field, fieldIndex }) => {
                const id = this.getFileFieldId(page, fieldIndex);
                const files = await this.fileRepository.load(id);
                if (files.length > 0) {
                    this.cachedFiles.set(id, files);
                    this.renderCachedFileStatus(field, files);
                }
            }));
        } catch (error) {
            console.warn("Briefing: não foi possível restaurar os arquivos do rascunho.", error);
        }
    }

    private renderCachedFileStatus(field: HTMLInputElement, files: File[]): void {
        const container = field.parentElement ?? field;
        let status = container.querySelector<HTMLElement>("[data-briefing-file-cache-status]");

        if (files.length === 0) {
            status?.remove();
            return;
        }

        if (!status) {
            status = document.createElement("small");
            status.dataset.briefingFileCacheStatus = "true";
            status.setAttribute("role", "status");
            field.insertAdjacentElement("afterend", status);
        }

        const names = files.map(file => file.name).join(", ");
        status.textContent = `${files.length} arquivo(s) salvo(s) no rascunho: ${names}`;
    }

    private async clearFileDrafts(): Promise<void> {
        this.cachedFiles.clear();
        try {
            await this.fileCacheReady;
            await this.fileRepository.removeByPrefix(`${this.draftStorageKey}:`);
            this.template.querySelectorAll("[data-briefing-file-cache-status]").forEach(status => status.remove());
        } catch (error) {
            console.warn("Briefing: não foi possível remover os arquivos do rascunho.", error);
        }
    }

    private clearDraft(): void {
        this.draftRepository.remove();
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
        const sections: BriefingAnswerSection[] = [];
        const roomsById = new Map<string, BriefingRoomAnswers>();

        this.pages.forEach(page => {
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
            project: { ...this.briefing.description },
            sections,
            rooms: Array.from(roomsById.values()).sort((a, b) => a.index - b.index),
            submittedAt: new Date().toISOString()
        };
    }

    private captureSection(page: HTMLElement): BriefingAnswerSection {
        const fields = Array.from(page.querySelectorAll<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >("input, select, textarea"));
        const processedGroups = new Set<string>();
        const answers: BriefingAnswer[] = [];

        fields.forEach((field, fieldIndex) => {
            if (this.isLogicallyDisabled(field) || field.closest(".briefing-navigation")) return;

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
                    && !this.isLogicallyDisabled(candidate)
                ) as HTMLInputElement[];
                const selectedValues = group.filter(candidate => candidate.checked).map(candidate => candidate.value);

                answers.push({
                    key,
                    question: this.getQuestion(field),
                    controlType: type,
                    value: type === "radio" ? (selectedValues[0] ?? "") : selectedValues
                });
                return;
            }

            if (field instanceof HTMLInputElement && field.type === "file") {
                const files = this.getFilesForField(page, fieldIndex, field);
                answers.push({
                    key,
                    question: this.getQuestion(field),
                    controlType: "file",
                    value: files.map((file, fileIndex) => ({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        uploadId: this.getFileUploadId(page, key, fileIndex)
                    }))
                });
                return;
            }

            const value = field instanceof HTMLSelectElement && field.multiple
                ? Array.from(field.selectedOptions).map(option => option.value)
                : field instanceof HTMLInputElement && field.type === "number"
                    ? Number(field.value)
                    : field.value;

            answers.push({ key, question: this.getQuestion(field), controlType: type, value });
        });

        return {
            key: page.dataset.briefingPageKey ?? page.className,
            title: page.querySelector<HTMLElement>(".briefing-title")?.textContent?.trim() ?? "",
            answers
        };
    }

    private isLogicallyDisabled(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
        const disabledBeforePageWasHidden = field.dataset.briefingDisabledBeforeHide;
        return disabledBeforePageWasHidden === undefined
            ? field.disabled
            : disabledBeforePageWasHidden === "true";
    }

    private getQuestion(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
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

    private async submitBriefing(): Promise<void> {
        await this.fileCacheReady;
        const attachments: BriefingAttachment[] = [];

        this.pages.forEach(page => {
            const fields = Array.from(page.querySelectorAll<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >("input, select, textarea"));
            const pageKey = page.dataset.briefingPageKey ?? page.className;

            fields.forEach((field, fieldIndex) => {
                if (!(field instanceof HTMLInputElement) || field.type !== "file" || this.isLogicallyDisabled(field)) return;

                const answerKey = field.name || field.id || `field-${fieldIndex + 1}`;
                this.getFilesForField(page, fieldIndex, field).forEach((file, fileIndex) => {
                    const uploadId = this.getFileUploadId(page, answerKey, fileIndex);
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

    private getFileUploadId(page: HTMLElement, answerKey: string, fileIndex: number): string {
        const pageKey = page.dataset.briefingPageKey ?? page.className;
        const roomKey = page.dataset.briefingRoomId
            ? `room-${page.dataset.briefingRoomId}`
            : "global";
        return `${roomKey}:${pageKey}:${answerKey}:${fileIndex}`;
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
