import { describe, expect, it } from "vitest";
import { surfaceFinishesTable } from "../src/client/templates/briefing/components/surface-finishes.template.js";

describe("surfaceFinishesTable", () => {
    it("cria uma seleção única com os cinco acabamentos para cada superfície", () => {
        const table = surfaceFinishesTable();
        const expectedValues = ["fosco", "acetinado", "cromado", "polido", "sem-preferencia"];
        const groups = ["cabinetry", "stones", "floor", "metals"];

        expect(table.querySelectorAll("tbody tr")).toHaveLength(4);
        groups.forEach(group => {
            const fields = Array.from(table.querySelectorAll<HTMLInputElement>(
                `input[name='surface-finish-${group}']`
            ));
            expect(fields.map(field => field.value)).toEqual(expectedValues);
            expect(fields.every(field => field.type === "radio")).toBe(true);
        });
        expect(table.textContent).not.toContain("Brilhante");
        expect(table.textContent).toContain("N/A");
        expect(table.textContent).not.toContain("Sem preferência");
    });
});
