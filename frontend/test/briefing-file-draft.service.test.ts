import { describe, expect, it, vi } from "vitest";
import { BriefingFileDraftService } from "../src/client/ui/briefing/briefing-file-draft.service.js";

function filePage(key = "documents") {
    const page = document.createElement("section");
    page.dataset.briefingPageKey = key;
    page.innerHTML = `<input type="text"><label><input type="file" multiple></label>`;
    return { page, field: page.querySelector<HTMLInputElement>('input[type="file"]')! };
}

function selectFiles(field: HTMLInputElement, files: File[]): void {
    Object.defineProperty(field, "files", { configurable: true, value: files });
}

describe("BriefingFileDraftService", () => {
    it("restaura arquivos pelo identificador legado e apresenta seus nomes", async () => {
        const restored = [new File(["a"], "planta.pdf", { type: "application/pdf" })];
        const store = {
            save: vi.fn(),
            load: vi.fn().mockResolvedValue(restored),
            removeByPrefix: vi.fn()
        };
        const { page, field } = filePage();
        const service = new BriefingFileDraftService("draft:client", store);

        service.initialize([page]);
        await service.waitUntilReady();

        expect(store.load).toHaveBeenCalledWith("draft:client:documents:1");
        expect(service.getFiles(page, 1, field)).toEqual(restored);
        expect(page.querySelector("[data-briefing-file-cache-status]")?.textContent).toContain("planta.pdf");
    });

    it("combina seleções, remove duplicados e limita cada campo a dez arquivos", async () => {
        const saved: File[][] = [];
        const store = {
            save: vi.fn(async (_id: string, files: File[]) => { saved.push(files); }),
            load: vi.fn().mockResolvedValue([]),
            removeByPrefix: vi.fn()
        };
        const { page, field } = filePage();
        const service = new BriefingFileDraftService("draft:client", store);
        service.initialize([page]);
        await service.waitUntilReady();
        const first = new File(["same"], "same.pdf", { lastModified: 1 });
        selectFiles(field, [first]);
        await service.save(field, [page]);
        selectFiles(field, [first, ...Array.from({ length: 11 }, (_, index) =>
            new File([String(index)], `file-${index}.pdf`, { lastModified: index + 2 }))]);

        await service.save(field, [page]);

        expect(saved[saved.length - 1]).toHaveLength(10);
        expect(saved[saved.length - 1].filter(file => file.name === "same.pdf")).toHaveLength(1);
        expect(page.querySelector("[data-briefing-file-cache-status]")?.textContent)
            .toContain("2 arquivo(s) excederam o limite de 10");
    });

    it("aguarda gravações pendentes antes de limpar repository e mensagem", async () => {
        let finishSave: (() => void) | undefined;
        const store = {
            save: vi.fn(() => new Promise<void>(resolve => { finishSave = resolve; })),
            load: vi.fn().mockResolvedValue([]),
            removeByPrefix: vi.fn().mockResolvedValue(undefined)
        };
        const { page, field } = filePage();
        const service = new BriefingFileDraftService("draft:client", store);
        service.initialize([page]);
        await service.waitUntilReady();
        selectFiles(field, [new File(["a"], "a.pdf")]);
        const saving = service.save(field, [page]);
        const clearing = service.clear(page);

        expect(store.removeByPrefix).not.toHaveBeenCalled();
        await Promise.resolve();
        finishSave?.();
        await saving;
        await clearing;

        expect(store.removeByPrefix).toHaveBeenCalledWith("draft:client:");
        expect(page.querySelector("[data-briefing-file-cache-status]")).toBeNull();
    });
});
