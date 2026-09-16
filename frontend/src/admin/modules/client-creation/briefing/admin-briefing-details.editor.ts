import type { briefingHome } from "@/admin/selectors/newClient/briefing.selector.js";
import type { BriefingDefinition } from "@/shared/briefing/briefing.types.js";
import u from "umbrellajs";

export class AdminBriefingDetailsEditor {
    constructor(private readonly briefing: BriefingDefinition) { }

    mount(elements: briefingHome): () => boolean {
        const description = this.briefing.description;
        elements.category.value = description?.category ?? "";
        elements.type.value = description?.type ?? "";
        elements.name.value = description?.name ?? "";
        elements.adultAmount.value = String(description?.adultAmount || "");
        elements.childrenAmount.value = String(description?.childrenAmount ?? "");

        this.fields(elements).forEach(field => {
            u(field)
                .off("input")
                .on("input", () => this.sync(elements))
                .off("change")
                .on("change", () => this.sync(elements));
        });
        this.sync(elements);
        return () => this.isValid(elements);
    }

    private sync(elements: briefingHome): void {
        this.briefing.description = {
            category: elements.category.value,
            type: elements.type.value,
            name: elements.name.value.trim(),
            adultAmount: Math.max(1, Math.floor(Number(elements.adultAmount.value) || 1)),
            childrenAmount: Math.max(0, Math.floor(Number(elements.childrenAmount.value) || 0))
        };
    }

    private isValid(elements: briefingHome): boolean {
        return Boolean(elements.category.value)
            && Boolean(elements.type.value)
            && Boolean(elements.name.value.trim())
            && Number.isInteger(Number(elements.adultAmount.value))
            && Number(elements.adultAmount.value) >= 1
            && Number.isInteger(Number(elements.childrenAmount.value))
            && Number(elements.childrenAmount.value) >= 0;
    }

    private fields(elements: briefingHome): (HTMLInputElement | HTMLSelectElement)[] {
        return [elements.category, elements.type, elements.name, elements.adultAmount, elements.childrenAmount];
    }
}
