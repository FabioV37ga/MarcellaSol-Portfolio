import { describe, expect, it, vi } from "vitest";
import type { CachedBriefingDraft } from "../src/client/infrastructure/briefing/briefing-draft.repository.js";
import { BriefingDraftService } from "../src/client/ui/briefing/briefing-draft.service.js";

function page(key: string, fields: string): HTMLElement {
    const element = document.createElement("section");
    element.dataset.briefingPageKey = key;
    element.innerHTML = fields;
    return element;
}

describe("BriefingDraftService", () => {
    it("salva o formato legado sem incluir senha ou arquivo", () => {
        let saved: CachedBriefingDraft | undefined;
        const service = new BriefingDraftService({
            save: draft => { saved = draft; },
            load: () => undefined,
            remove: vi.fn()
        });
        const briefingPage = page("about", `
            <input type="text" value="Resposta">
            <input type="checkbox" checked value="sim">
            <select multiple><option value="a" selected>A</option><option value="b">B</option></select>
            <input type="password" value="segredo">
            <input type="file">
        `);

        service.save([briefingPage], 2);

        expect(saved).toEqual({
            version: 1,
            currentPage: 2,
            fields: [
                { pageKey: "about", fieldIndex: 0, type: "text", value: "Resposta", checked: undefined },
                { pageKey: "about", fieldIndex: 1, type: "checkbox", value: "sim", checked: true },
                { pageKey: "about", fieldIndex: 2, type: "select", value: ["a"], checked: undefined }
            ]
        });
    });

    it("restaura campos compatíveis e limita a página ao intervalo disponível", () => {
        const first = page("first", `<input type="text"><input type="checkbox">`);
        const second = page("second", `<select multiple><option value="a">A</option><option value="b">B</option></select>`);
        const service = new BriefingDraftService({
            save: vi.fn(),
            load: () => ({
                version: 1,
                currentPage: 20,
                fields: [
                    { pageKey: "first", fieldIndex: 0, type: "text", value: "Restaurada" },
                    { pageKey: "first", fieldIndex: 1, type: "checkbox", value: "on", checked: true },
                    { pageKey: "second", fieldIndex: 0, type: "select", value: ["b"] }
                ]
            }),
            remove: vi.fn()
        });

        expect(service.restore([first, second])).toBe(1);
        expect(first.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe("Restaurada");
        expect(first.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
        expect(Array.from(second.querySelectorAll<HTMLOptionElement>("option")).map(option => option.selected))
            .toEqual([false, true]);
    });

    it("delega a remoção do rascunho ao repository", () => {
        const remove = vi.fn();
        const service = new BriefingDraftService({ save: vi.fn(), load: () => undefined, remove });

        service.remove();

        expect(remove).toHaveBeenCalledOnce();
    });
});
