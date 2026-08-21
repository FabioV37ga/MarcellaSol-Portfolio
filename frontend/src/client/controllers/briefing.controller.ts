import { config } from "@/utils/connection.js";
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

export interface BriefingRoom {
    id: number;
    index: number;
    name: string;
    type: string;
    subtype?: string;
    options: boolean[];
}

export interface BriefingObject {
    id?: string;
    user?: { name?: string };
    description: {
        category: string;
        type: string;
        name: string;
        residentAmount: number;
    };
    investmentFlexibility: boolean;
    rooms: BriefingRoom[];
}

export interface ClientObject {
    id?: string;
    name: string;
    hasFilledBriefing: boolean;
}

export interface ClientBriefingResponse {
    clientObject?: Partial<ClientObject>;
    briefingObject?: Partial<BriefingObject>;
}

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
): { clientObject: ClientObject; briefingObject: BriefingObject } {
    const rawBriefing = response.briefingObject ?? {};
    const description = rawBriefing.description ?? {} as BriefingObject["description"];
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

interface BriefingFileManifestEntry {
    uploadId: string;
    pageKey: string;
    answerKey: string;
    fileIndex: number;
    originalName: string;
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
    project: BriefingObject["description"];
    sections: BriefingAnswerSection[];
    rooms: BriefingRoomAnswers[];
    submittedAt: string;
}

interface CachedBriefingField {
    pageKey: string;
    fieldIndex: number;
    type: string;
    value: string | string[];
    checked?: boolean;
}

interface CachedBriefingDraft {
    version: 1;
    currentPage: number;
    fields: CachedBriefingField[];
}

interface CachedBriefingFiles {
    id: string;
    files: File[];
    savedAt: string;
}

export default class ClientBriefingController {
    private readonly pages: HTMLElement[];
    private readonly template: HTMLElement;
    private currentPage = 0;
    private navigationBound = false;
    private readonly draftStorageKey: string;
    private readonly cachedFiles = new Map<string, File[]>();
    private fileCacheReady: Promise<void> = Promise.resolve();

    constructor(
        readonly client: ClientObject,
        readonly briefing: BriefingObject,
        private readonly authentication: { login: string; password: string }
    ) {
        const ownerKey = briefing.id || client.id || authentication.login;
        this.draftStorageKey = `client-briefing-draft:v1:${ownerKey}`;
        const generatedPages = this.createPages();
        this.template = briefingTemplate(generatedPages);
        this.pages = Array.from(
            this.template.querySelectorAll<HTMLElement>(".form-page-container > div")
        );

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
        return pageElement;
    }

    private showPage(
        index: number,
        historyOptions: { pushHistory?: boolean; replaceHistory?: boolean } = {}
    ): void {
        if (index < 0 || index >= this.pages.length) return;

        const page = this.pages[index];
        const progress = this.template.querySelector<HTMLElement>(".progress");

        if (!page || !progress) return;

        this.currentPage = index;
        this.pages.forEach((candidate, candidateIndex) => {
            const isCurrentPage = candidateIndex === index;
            candidate.hidden = !isCurrentPage;
            candidate.setAttribute("aria-hidden", String(!isCurrentPage));

            candidate.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
                "input, select, textarea, button"
            ).forEach(field => {
                if (!isCurrentPage) {
                    if (field.dataset.briefingDisabledBeforeHide === undefined) {
                        field.dataset.briefingDisabledBeforeHide = String(field.disabled);
                    }
                    field.disabled = true;
                    return;
                }

                const wasDisabled = field.dataset.briefingDisabledBeforeHide === "true";
                field.disabled = wasDisabled;
                delete field.dataset.briefingDisabledBeforeHide;
            });
        });
        progress.setAttribute("aria-valuemax", String(this.pages.length));
        progress.setAttribute("aria-valuenow", String(index + 1));
        progress.style.setProperty("--briefing-progress", `${((index + 1) / this.pages.length) * 100}%`);
        this.configureRequiredFields(page);
        this.syncActiveIndex(page);
        this.syncAmbientSummary(page);
        this.syncAirConditionerFields(page);
        this.syncAutomationFields(page);
        this.syncPetFields(page);
        this.syncAttentionOtherField(page);
        this.syncOtherFields(page);
        this.syncBedSizeField(page);
        this.syncIgnoredItems(page);
        this.bindTextCounters(page);

        const historyState = { page: "briefing", briefingStep: index };
        if (historyOptions.replaceHistory) {
            window.history.replaceState(historyState, "");
        } else if (historyOptions.pushHistory ?? true) {
            window.history.pushState(historyState, "");
        }

        this.saveDraft();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    private syncActiveIndex(page: HTMLElement): void {
        const pageKey = page.dataset.briefingPageKey ?? "";
        let section = "environments";

        if (pageKey === "welcome") section = "welcome";
        else if (pageKey.startsWith("about-")) section = "about";
        else if (pageKey === "routine") section = "routine";
        else if (pageKey === "investment") section = "investment";
        else if (pageKey.startsWith("preferences-")) section = "preferences";
        else if (pageKey === "ending") section = "ending";

        this.template.querySelectorAll<HTMLElement>("[data-briefing-index]").forEach(item => {
            const isActive = item.dataset.briefingIndex === section;
            item.classList.toggle("is-active", isActive);
            if (isActive) item.setAttribute("aria-current", "step");
            else item.removeAttribute("aria-current");
        });
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

            if (field.name === "home-automation") {
                this.syncAutomationFields(this.pages[this.currentPage]);
            }

            if (field.name === "air-conditioning-structure") {
                this.syncAirConditionerFields(this.pages[this.currentPage]);
            }

            if (field.name === "has-pets") {
                this.syncPetFields(this.pages[this.currentPage]);
            }

            if (field.type === "checkbox" && field.closest("[data-max-selections]")) {
                this.syncMaximumSelections(field.closest<HTMLElement>("[data-max-selections]")!);
            }

            if (field.name === "form-input-66" && field.value === "outros") {
                this.syncAttentionOtherField(this.pages[this.currentPage]);
            }

            if (/^(outro|outros)$/.test(field.value)) {
                this.syncOtherFields(this.pages[this.currentPage]);
            }

            if (field.type === "checkbox" && field.name === "form-input-103" && field.value === "cama") {
                this.syncBedSizeField(this.pages[this.currentPage]);
            }

            if (field.closest(".briefing-ignore-option")) {
                this.syncIgnoredItems(this.pages[this.currentPage]);
            }

            if (this.isCacheableField(field)) this.saveDraft();
        });

        this.template.addEventListener("click", async (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const control = target.closest<HTMLElement>(".briefing-navigation a, .briefing-navigation button");
            const navigation = control?.closest<HTMLElement>(".briefing-navigation");

            if (!control || !navigation) return;

            event.preventDefault();

            const controls = Array.from(navigation.querySelectorAll<HTMLElement>("a, button"));
            const isBackControl = this.currentPage > 0 && control === controls[0];

            if (isBackControl) {
                window.history.back();
                return;
            }

            console.info(`Briefing: continuar da etapa ${this.currentPage + 1}`);

            const page = this.pages[this.currentPage];
            const form = this.template.querySelector<HTMLFormElement>(".form-page-container");
            this.validateCheckboxGroups(page);
            if (form && !form.checkValidity()) {
                this.logInvalidFields(page);
                form.reportValidity();
                return;
            }

            if (this.currentPage < this.pages.length - 1) {
                this.showPage(this.currentPage + 1);
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

        const draft: CachedBriefingDraft = { version: 1, currentPage: this.currentPage, fields };
        try {
            localStorage.setItem(this.draftStorageKey, JSON.stringify(draft));
        } catch (error) {
            console.warn("Briefing: não foi possível salvar o rascunho local.", error);
        }
    }

    private restoreDraft(): number {
        let draft: CachedBriefingDraft | undefined;
        try {
            const serializedDraft = localStorage.getItem(this.draftStorageKey);
            if (serializedDraft) draft = JSON.parse(serializedDraft) as CachedBriefingDraft;
        } catch (error) {
            console.warn("Briefing: o rascunho local não pôde ser restaurado.", error);
            this.clearDraft();
        }

        if (!draft || draft.version !== 1 || !Array.isArray(draft.fields)) return 0;

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

        const operation = this.fileCacheReady.then(async () => {
            const database = await this.openFileDatabase();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction("files", "readwrite");
                const store = transaction.objectStore("files");
                if (files.length > 0) {
                    const record: CachedBriefingFiles = { id, files, savedAt: new Date().toISOString() };
                    store.put(record);
                } else {
                    store.delete(id);
                }
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
            database.close();
        }).catch(error => {
            console.warn("Briefing: não foi possível salvar os arquivos do rascunho.", error);
        });

        this.fileCacheReady = operation;
        await operation;
    }

    private async restoreFileDrafts(): Promise<void> {
        try {
            const database = await this.openFileDatabase();
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

            await Promise.all(fileFields.map(({ page, field, fieldIndex }) => new Promise<void>((resolve, reject) => {
                const id = this.getFileFieldId(page, fieldIndex);
                const request = database.transaction("files", "readonly")
                    .objectStore("files")
                    .get(id);
                request.onsuccess = () => {
                    const record = request.result as CachedBriefingFiles | undefined;
                    if (record?.files?.length) {
                        this.cachedFiles.set(id, record.files);
                        this.renderCachedFileStatus(field, record.files);
                    }
                    resolve();
                };
                request.onerror = () => reject(request.error);
            })));
            database.close();
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

    private openFileDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("marcella-sol-client-drafts", 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains("files")) {
                    request.result.createObjectStore("files", { keyPath: "id" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("O banco local de arquivos está bloqueado."));
        });
    }

    private async clearFileDrafts(): Promise<void> {
        this.cachedFiles.clear();
        try {
            await this.fileCacheReady;
            const database = await this.openFileDatabase();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction("files", "readwrite");
                const store = transaction.objectStore("files");
                const request = store.getAllKeys();
                request.onsuccess = () => {
                    request.result
                        .filter(key => typeof key === "string" && key.startsWith(`${this.draftStorageKey}:`))
                        .forEach(key => store.delete(key));
                };
                request.onerror = () => reject(request.error);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
            database.close();
            this.template.querySelectorAll("[data-briefing-file-cache-status]").forEach(status => status.remove());
        } catch (error) {
            console.warn("Briefing: não foi possível remover os arquivos do rascunho.", error);
        }
    }

    private clearDraft(): void {
        try {
            localStorage.removeItem(this.draftStorageKey);
        } catch (error) {
            console.warn("Briefing: não foi possível remover o rascunho local.", error);
        }
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
        const formData = new FormData();
        const fileManifest: BriefingFileManifestEntry[] = [];

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
                    fileManifest.push({ uploadId, pageKey, answerKey, fileIndex, originalName: file.name });
                    formData.append("files", file, file.name);
                });
            });
        });

        formData.append("payload", JSON.stringify({
            ...this.authentication,
            briefing: this.buildCompletedBriefing(),
            fileManifest
        }));

        const response = await fetch(`${config.apiBaseUrl}/client/briefing`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({})) as { message?: string };
            throw new Error(result.message || "Não foi possível enviar o briefing.");
        }
    }

    private getFileUploadId(page: HTMLElement, answerKey: string, fileIndex: number): string {
        const pageKey = page.dataset.briefingPageKey ?? page.className;
        const roomKey = page.dataset.briefingRoomId
            ? `room-${page.dataset.briefingRoomId}`
            : "global";
        return `${roomKey}:${pageKey}:${answerKey}:${fileIndex}`;
    }

    private syncAmbientSummary(page: HTMLElement): void {
        const areaOutput = page.querySelector<HTMLElement>("[data-briefing-property-area]");
        if (!areaOutput) return;

        const areaField = this.template.querySelector<HTMLInputElement>('#property-area');
        areaOutput.textContent = areaField?.value ? `${areaField.value} m²` : "Não informado";
    }

    private syncAutomationFields(page: HTMLElement): void {
        const selectedOption = page.querySelector<HTMLInputElement>(
            'input[name="home-automation"]:checked'
        );
        const shouldShowDetails = selectedOption?.value === "sim";

        page.querySelectorAll<HTMLElement>(".briefing-automation-details").forEach(container => {
            container.hidden = !shouldShowDetails;
            container.setAttribute("aria-hidden", String(!shouldShowDetails));
            container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                "input, select, textarea"
            ).forEach(field => {
                field.disabled = !shouldShowDetails;
            });
        });
    }

    private syncAirConditionerFields(page: HTMLElement): void {
        const selectedOption = page.querySelector<HTMLInputElement>(
            'input[name="air-conditioning-structure"]:checked'
        );
        const shouldShowDetails = selectedOption?.value === "sim";

        page.querySelectorAll<HTMLElement>(".briefing-air-conditioning-details").forEach(container => {
            container.hidden = !shouldShowDetails;
            container.setAttribute("aria-hidden", String(!shouldShowDetails));
            container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                "input, select, textarea"
            ).forEach(field => {
                field.disabled = !shouldShowDetails;
            });
        });
    }

    private syncPetFields(page: HTMLElement): void {
        const selectedOption = page.querySelector<HTMLInputElement>(
            'input[name="has-pets"]:checked'
        );
        const shouldShowDetails = selectedOption?.value === "sim";

        page.querySelectorAll<HTMLElement>(".briefing-pet-details").forEach(container => {
            container.hidden = !shouldShowDetails;
            container.setAttribute("aria-hidden", String(!shouldShowDetails));
            container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                "input, select, textarea"
            ).forEach(field => {
                field.disabled = !shouldShowDetails;
            });
        });
    }

    private syncMaximumSelections(group: HTMLElement): void {
        const maximum = Number(group.dataset.maxSelections);
        const fields = Array.from(group.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
        const selectedAmount = fields.filter(field => field.checked).length;

        if (!Number.isFinite(maximum)) return;

        fields.forEach(field => {
            field.disabled = selectedAmount >= maximum && !field.checked;
        });
    }

    private syncAttentionOtherField(page: HTMLElement): void {
        const otherOption = page.querySelector<HTMLInputElement>(
            'input[name="form-input-66"][value="outros"]'
        );
        const details = page.querySelector<HTMLElement>(".briefing-attention-details");
        const field = details?.querySelector<HTMLInputElement>("input");

        if (!details || !field) return;

        const shouldShowDetails = Boolean(otherOption?.checked);
        details.hidden = !shouldShowDetails;
        details.setAttribute("aria-hidden", String(!shouldShowDetails));
        field.disabled = !shouldShowDetails;
        field.required = shouldShowDetails;
    }

    private syncOtherFields(page: HTMLElement): void {
        const controls = Array.from(page.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            'input[type="checkbox"], select'
        ));

        page.querySelectorAll<HTMLElement>("[data-briefing-other-for]").forEach(target => {
            const groupName = target.dataset.briefingOtherFor;
            const otherOption = controls.find(field =>
                field.name === groupName && /^(outro|outros)$/.test(field.value)
            );
            const shouldShow = otherOption instanceof HTMLSelectElement
                ? /^(outro|outros)$/.test(otherOption.value)
                : Boolean(otherOption?.checked);
            const fields = target.matches("input, select, textarea")
                ? [target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement]
                : Array.from(target.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                    "input, select, textarea"
                ));

            target.hidden = !shouldShow;
            target.setAttribute("aria-hidden", String(!shouldShow));
            fields.forEach(field => {
                field.disabled = !shouldShow;
                field.required = shouldShow;
            });
        });
    }

    private syncBedSizeField(page: HTMLElement): void {
        const bedOption = page.querySelector<HTMLInputElement>(
            'input[type="checkbox"][name="form-input-103"][value="cama"]'
        );
        const sizeField = page.querySelector<HTMLSelectElement>("[data-briefing-bed-size]");
        if (!sizeField) return;

        const shouldShow = Boolean(bedOption?.checked);
        sizeField.hidden = !shouldShow;
        sizeField.setAttribute("aria-hidden", String(!shouldShow));
        sizeField.disabled = !shouldShow;
        sizeField.required = shouldShow;
    }

    private syncIgnoredItems(page: HTMLElement): void {
        page.querySelectorAll<HTMLInputElement>(
            '.briefing-ignore-option input[type="checkbox"]'
        ).forEach(ignoreField => {
            const box = ignoreField.closest<HTMLElement>(".briefing-input-box");
            if (!box) return;

            box.classList.toggle("is-not-considered", ignoreField.checked);
            box.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                "input, select, textarea"
            ).forEach(field => {
                if (field === ignoreField) return;

                if (ignoreField.checked) {
                    if (field.dataset.wasRequired === undefined) {
                        field.dataset.wasRequired = String(field.required);
                    }
                    field.required = false;
                    field.disabled = true;
                    return;
                }

                if (field.dataset.wasRequired !== undefined) {
                    field.required = field.dataset.wasRequired === "true";
                    delete field.dataset.wasRequired;
                }
                field.disabled = false;
            });
        });
    }

    private configureRequiredFields(page: HTMLElement): void {
        page.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            "input:not([type='checkbox']):not([type='file']), select, textarea"
        ).forEach(field => {
            if (!this.isOptionalField(field)) field.required = true;
        });

        page.querySelectorAll<HTMLInputElement>("input[type='radio']")
            .forEach(field => { field.required = true; });

        page.querySelectorAll<HTMLInputElement>("input[type='checkbox']")
            .forEach(field => {
                if (field.closest(".briefing-ignore-option")) return;
                field.addEventListener("change", () => this.validateCheckboxGroups(page));
            });

        page.querySelectorAll<HTMLElement>("[data-max-selections]")
            .forEach(group => this.syncMaximumSelections(group));
    }

    private isOptionalField(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
        const container = field.closest<HTMLElement>(".briefing-input-box, fieldset, label");
        const context = container?.textContent?.toLowerCase() ?? "";
        const identity = `${field.name} ${field.className} ${field.getAttribute("placeholder") ?? ""}`.toLowerCase();

        return context.includes("opcional")
            || field.hasAttribute("data-briefing-optional")
            || context.includes("algum outro item")
            || identity.includes("other")
            || identity.includes("outro")
            || identity.includes("qual?")
            || field.disabled;
    }

    private validateCheckboxGroups(page: HTMLElement): void {
        const groups = new Map<string, HTMLInputElement[]>();

        page.querySelectorAll<HTMLInputElement>("input[type='checkbox'][name]").forEach(field => {
            if (field.closest(".briefing-ignore-option") || this.isOptionalField(field)) return;

            const fields = groups.get(field.name) ?? [];
            fields.push(field);
            groups.set(field.name, fields);
        });

        groups.forEach(fields => {
            const message = fields.some(field => field.checked)
                ? ""
                : "Selecione pelo menos uma opção.";

            fields[0]?.setCustomValidity(message);
        });
    }

    private logInvalidFields(page: HTMLElement): void {
        const invalidFields = Array.from(
            page.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                "input:invalid, select:invalid, textarea:invalid"
            )
        );

        console.group(`Briefing: ${invalidFields.length} campo(s) inválido(s)`);
        invalidFields.forEach(field => {
            const label = field.labels?.[0]?.textContent?.trim();

            console.warn({
                field: field.name || field.id || "sem identificador",
                label: label || "sem label",
                type: field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase(),
                value: field.value,
                message: field.validationMessage,
                validity: {
                    valueMissing: field.validity.valueMissing,
                    typeMismatch: field.validity.typeMismatch,
                    patternMismatch: field.validity.patternMismatch,
                    tooShort: field.validity.tooShort,
                    tooLong: field.validity.tooLong,
                    rangeUnderflow: field.validity.rangeUnderflow,
                    rangeOverflow: field.validity.rangeOverflow,
                    stepMismatch: field.validity.stepMismatch,
                    badInput: field.validity.badInput,
                    customError: field.validity.customError
                },
                element: field
            });
        });
        console.groupEnd();
    }

    private bindTextCounters(page: HTMLElement): void {
        page.querySelectorAll<HTMLTextAreaElement>("textarea[maxlength]").forEach(field => {
            const counter = field.parentElement?.querySelector<HTMLElement>(":scope > small");
            if (!counter) return;

            const update = () => { counter.textContent = `${field.value.length}/${field.maxLength}`; };
            field.addEventListener("input", update);
            update();
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
