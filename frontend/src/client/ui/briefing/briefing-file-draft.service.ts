import type { BriefingFileRepository } from "../../infrastructure/briefing/briefing-file.repository.js";

type BriefingField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type BriefingFileStore = Pick<BriefingFileRepository, "save" | "load" | "removeByPrefix">;

const maxFilesPerField = 10;

export class BriefingFileDraftService {
    private readonly cachedFiles = new Map<string, File[]>();
    private pending: Promise<void> = Promise.resolve();

    constructor(
        private readonly storageKey: string,
        private readonly files: BriefingFileStore
    ) { }

    initialize(pages: HTMLElement[]): void {
        this.pending = this.restore(pages);
    }

    async save(field: HTMLInputElement, pages: HTMLElement[]): Promise<void> {
        const page = pages.find(candidate => candidate.contains(field));
        if (!page) return;

        const fieldIndex = this.fields(page).indexOf(field);
        if (fieldIndex < 0) return;

        const id = this.fieldId(page, fieldIndex);
        const previousFiles = this.cachedFiles.get(id) ?? [];
        const selectedFiles = Array.from(field.files ?? []);
        const uniqueFiles = new Map<string, File>();
        [...previousFiles, ...selectedFiles].forEach(file => {
            uniqueFiles.set(`${file.name}:${file.size}:${file.lastModified}`, file);
        });
        const allFiles = Array.from(uniqueFiles.values());
        const acceptedFiles = allFiles.slice(0, maxFilesPerField);

        if (acceptedFiles.length > 0) this.cachedFiles.set(id, acceptedFiles);
        else this.cachedFiles.delete(id);
        this.renderStatus(field, acceptedFiles, allFiles.length - acceptedFiles.length);

        const operation = this.pending
            .then(() => this.files.save(id, acceptedFiles))
            .catch(error => console.warn("Briefing: não foi possível salvar os arquivos do rascunho.", error));
        this.pending = operation;
        await operation;
    }

    getFiles(page: HTMLElement, fieldIndex: number, field: HTMLInputElement): File[] {
        return this.cachedFiles.get(this.fieldId(page, fieldIndex)) ?? Array.from(field.files ?? []);
    }

    waitUntilReady(): Promise<void> {
        return this.pending;
    }

    async clear(template: HTMLElement): Promise<void> {
        this.cachedFiles.clear();
        try {
            await this.pending;
            await this.files.removeByPrefix(`${this.storageKey}:`);
            template.querySelectorAll("[data-briefing-file-cache-status]").forEach(status => status.remove());
        } catch (error) {
            console.warn("Briefing: não foi possível remover os arquivos do rascunho.", error);
        }
    }

    private async restore(pages: HTMLElement[]): Promise<void> {
        try {
            const fileFields = pages.reduce<Array<{
                page: HTMLElement;
                field: HTMLInputElement;
                fieldIndex: number;
            }>>((result, page) => {
                this.fields(page).forEach((field, fieldIndex) => {
                    if (field instanceof HTMLInputElement && field.type === "file") {
                        result.push({ page, field, fieldIndex });
                    }
                });
                return result;
            }, []);

            await Promise.all(fileFields.map(async ({ page, field, fieldIndex }) => {
                const id = this.fieldId(page, fieldIndex);
                const restoredFiles = await this.files.load(id);
                if (restoredFiles.length > 0) {
                    this.cachedFiles.set(id, restoredFiles);
                    this.renderStatus(field, restoredFiles);
                }
            }));
        } catch (error) {
            console.warn("Briefing: não foi possível restaurar os arquivos do rascunho.", error);
        }
    }

    private renderStatus(field: HTMLInputElement, files: File[], rejectedCount = 0): void {
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
        const rejectedMessage = rejectedCount > 0
            ? ` ${rejectedCount} arquivo(s) excederam o limite de ${maxFilesPerField} e não foram adicionados.`
            : "";
        status.textContent = `${files.length} arquivo(s) salvo(s) no rascunho: ${names}.${rejectedMessage}`;
    }

    private fieldId(page: HTMLElement, fieldIndex: number): string {
        const pageKey = page.dataset.briefingPageKey ?? page.className;
        return `${this.storageKey}:${pageKey}:${fieldIndex}`;
    }

    private fields(page: HTMLElement): BriefingField[] {
        return Array.from(page.querySelectorAll<BriefingField>("input, select, textarea"));
    }
}
