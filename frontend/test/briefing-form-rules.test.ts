import { describe, expect, it } from "vitest";
import { routine } from "../src/client/templates/briefing/routine.template.js";
import { BriefingFormRules } from "../src/client/ui/briefing/briefing-form-rules.js";

describe("BriefingFormRules", () => {
    it("mantém preço, qualidade e tempo exclusivos entre as três prioridades", () => {
        const page = routine();
        const fields = Array.from(page.querySelectorAll<HTMLSelectElement>(
            "select[data-exclusive-project-priority]"
        ));
        const rules = new BriefingFormRules(page);

        expect(fields).toHaveLength(3);
        fields.forEach(field => expect(Array.from(field.options).map(option => option.value))
            .toEqual(["", "preco", "qualidade", "tempo"]));

        fields[0].value = "preco";
        rules.handleChange(fields[0], page);
        fields[1].value = "preco";
        rules.handleChange(fields[1], page);

        expect(fields.map(field => field.value)).toEqual(["", "preco", ""]);
    });

    it("ao restaurar prioridades repetidas preserva somente a última posição", () => {
        const page = routine();
        const fields = Array.from(page.querySelectorAll<HTMLSelectElement>(
            "select[data-exclusive-project-priority]"
        ));
        fields[0].value = "qualidade";
        fields[1].value = "qualidade";

        new BriefingFormRules(page).preparePage(page);

        expect(fields.map(field => field.value)).toEqual(["", "qualidade", ""]);
    });
});
