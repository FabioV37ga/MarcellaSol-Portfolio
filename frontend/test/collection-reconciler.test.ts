import { describe, expect, it } from "vitest";
import { reconcileCollection } from "../src/shared/visual-persistence/collection-reconciler.js";

interface Item { id: string; label: string; ignored?: string; }

const reconciliation = {
    keyOf: (item: Item) => item.id,
    visuallyEqual: (previous: Item, next: Item) => previous.label === next.label
};

describe("reconciliador de coleções visuais", () => {
    it("classifica itens visualmente iguais como inalterados", () => {
        const delta = reconcileCollection(
            [{ id: "a", label: "Cliente", ignored: "antes" }],
            [{ id: "a", label: "Cliente", ignored: "depois" }],
            reconciliation
        );

        expect(delta.unchanged.map(item => item.key)).toEqual(["a"]);
        expect(delta.updated).toEqual([]);
        expect(delta.moved).toEqual([]);
    });

    it("separa inserções, atualizações e remoções", () => {
        const delta = reconcileCollection(
            [{ id: "a", label: "Antigo" }, { id: "removed", label: "Removido" }],
            [{ id: "a", label: "Atualizado" }, { id: "inserted", label: "Inserido" }],
            reconciliation
        );

        expect(delta.updated).toEqual([expect.objectContaining({ key: "a", index: 0 })]);
        expect(delta.inserted).toEqual([expect.objectContaining({ key: "inserted", index: 1 })]);
        expect(delta.removed).toEqual([expect.objectContaining({ key: "removed", index: 1 })]);
    });

    it("registra movimentos sem transformar itens iguais em atualizações", () => {
        const previous = [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }];
        const next = [{ id: "c", label: "C" }, { id: "a", label: "A" }, { id: "b", label: "B" }];
        const delta = reconcileCollection(previous, next, reconciliation);

        expect(delta.moved).toEqual([
            expect.objectContaining({ key: "c", fromIndex: 2, toIndex: 0 }),
            expect.objectContaining({ key: "a", fromIndex: 0, toIndex: 1 }),
            expect.objectContaining({ key: "b", fromIndex: 1, toIndex: 2 })
        ]);
        expect(delta.updated).toEqual([]);
        expect(delta.unchanged).toHaveLength(3);
    });

    it("permite que um item seja atualizado e movido na mesma reconciliação", () => {
        const delta = reconcileCollection(
            [{ id: "a", label: "A" }, { id: "b", label: "B" }],
            [{ id: "b", label: "B atualizado" }, { id: "a", label: "A" }],
            reconciliation
        );

        expect(delta.moved.map(item => item.key)).toEqual(["b", "a"]);
        expect(delta.updated.map(item => item.key)).toEqual(["b"]);
        expect(delta.unchanged.map(item => item.key)).toEqual(["a"]);
    });

    it("rejeita identidades vazias ou duplicadas em qualquer lado", () => {
        expect(() => reconcileCollection(
            [{ id: "a", label: "A" }, { id: "a", label: "Duplicado" }],
            [],
            reconciliation
        )).toThrow('coleção anterior contém a identidade duplicada "a"');
        expect(() => reconcileCollection(
            [],
            [{ id: " ", label: "Sem identidade" }],
            reconciliation
        )).toThrow("coleção nova contém uma identidade vazia");
    });
});
