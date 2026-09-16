import type { briefingInvestment } from "@/admin/selectors/newClient/briefing.selector.js";
import type { BriefingDefinition } from "@/shared/briefing/briefing.types.js";
import u from "umbrellajs";

export class AdminBriefingInvestmentEditor {
    constructor(private readonly briefing: BriefingDefinition) { }

    mount(elements: briefingInvestment): void {
        elements.flexibility.checked = this.briefing.investmentFlexibility ?? false;
        u(elements.flexibility)
            .off("change")
            .on("change", () => this.sync(elements));
        this.sync(elements);
    }

    private sync(elements: briefingInvestment): void {
        this.briefing.investmentFlexibility = elements.flexibility.checked;
    }
}
