type BriefingField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export class BriefingFormRules {
    constructor(private readonly template: HTMLElement) {}

    preparePage(page: HTMLElement): void {
        this.configureRequiredFields(page);
        this.syncAmbientSummary(page);
        this.syncAirConditionerFields(page);
        this.syncAutomationFields(page);
        this.syncPetFields(page);
        this.syncAttentionOtherField(page);
        this.syncOtherFields(page);
        this.syncBedSizeField(page);
        this.syncIgnoredItems(page);
        this.bindTextCounters(page);
    }

    handleChange(field: HTMLInputElement, page: HTMLElement): void {
        if (field.name === "home-automation") this.syncAutomationFields(page);
        if (field.name === "air-conditioning-structure") this.syncAirConditionerFields(page);
        if (field.name === "has-pets") this.syncPetFields(page);

        if (field.type === "checkbox" && field.closest("[data-max-selections]")) {
            this.syncMaximumSelections(field.closest<HTMLElement>("[data-max-selections]")!);
        }
        if (field.name === "form-input-66" && field.value === "outros") this.syncAttentionOtherField(page);
        if (/^(outro|outros)$/.test(field.value)) this.syncOtherFields(page);
        if (field.type === "checkbox" && field.name === "form-input-103" && field.value === "cama") {
            this.syncBedSizeField(page);
        }
        if (field.closest(".briefing-ignore-option")) this.syncIgnoredItems(page);
    }

    validatePage(page: HTMLElement, form?: HTMLFormElement): boolean {
        this.validateCheckboxGroups(page);
        if (!form || form.checkValidity()) return true;

        this.logInvalidFields(page);
        form.reportValidity();
        return false;
    }

    private syncAmbientSummary(page: HTMLElement): void {
        const areaOutput = page.querySelector<HTMLElement>("[data-briefing-property-area]");
        if (!areaOutput) return;

        const areaField = this.template.querySelector<HTMLInputElement>("#property-area");
        areaOutput.textContent = areaField?.value ? `${areaField.value} m²` : "Não informado";
    }

    private syncConditionalDetails(page: HTMLElement, selector: string, detailsSelector: string): void {
        const selectedOption = page.querySelector<HTMLInputElement>(`${selector}:checked`);
        const shouldShowDetails = selectedOption?.value === "sim";

        page.querySelectorAll<HTMLElement>(detailsSelector).forEach(container => {
            container.hidden = !shouldShowDetails;
            container.setAttribute("aria-hidden", String(!shouldShowDetails));
            container.querySelectorAll<BriefingField>("input, select, textarea").forEach(field => {
                field.disabled = !shouldShowDetails;
            });
        });
    }

    private syncAutomationFields(page: HTMLElement): void {
        this.syncConditionalDetails(page, 'input[name="home-automation"]', ".briefing-automation-details");
    }

    private syncAirConditionerFields(page: HTMLElement): void {
        this.syncConditionalDetails(page, 'input[name="air-conditioning-structure"]', ".briefing-air-conditioning-details");
    }

    private syncPetFields(page: HTMLElement): void {
        this.syncConditionalDetails(page, 'input[name="has-pets"]', ".briefing-pet-details");
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
        const otherOption = page.querySelector<HTMLInputElement>('input[name="form-input-66"][value="outros"]');
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
                ? [target as BriefingField]
                : Array.from(target.querySelectorAll<BriefingField>("input, select, textarea"));

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
        page.querySelectorAll<HTMLInputElement>('.briefing-ignore-option input[type="checkbox"]').forEach(ignoreField => {
            const box = ignoreField.closest<HTMLElement>(".briefing-input-box");
            if (!box) return;

            box.classList.toggle("is-not-considered", ignoreField.checked);
            box.querySelectorAll<BriefingField>("input, select, textarea").forEach(field => {
                if (field === ignoreField) return;
                if (ignoreField.checked) {
                    if (field.dataset.wasRequired === undefined) field.dataset.wasRequired = String(field.required);
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
        page.querySelectorAll<BriefingField>(
            "input:not([type='checkbox']):not([type='file']), select, textarea"
        ).forEach(field => {
            if (!this.isOptionalField(field)) field.required = true;
        });
        page.querySelectorAll<HTMLInputElement>("input[type='radio']").forEach(field => { field.required = true; });
        page.querySelectorAll<HTMLInputElement>("input[type='checkbox']").forEach(field => {
            if (field.closest(".briefing-ignore-option") || field.dataset.briefingValidationBound === "true") return;
            field.dataset.briefingValidationBound = "true";
            field.addEventListener("change", () => this.validateCheckboxGroups(page));
        });
        page.querySelectorAll<HTMLElement>("[data-max-selections]").forEach(group => this.syncMaximumSelections(group));
    }

    private isOptionalField(field: BriefingField): boolean {
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
            fields[0]?.setCustomValidity(fields.some(field => field.checked) ? "" : "Selecione pelo menos uma opção.");
        });
    }

    private logInvalidFields(page: HTMLElement): void {
        const invalidFields = Array.from(page.querySelectorAll<BriefingField>(
            "input:invalid, select:invalid, textarea:invalid"
        ));
        console.group(`Briefing: ${invalidFields.length} campo(s) inválido(s)`);
        invalidFields.forEach(field => console.warn({
            field: field.name || field.id || "sem identificador",
            label: field.labels?.[0]?.textContent?.trim() || "sem label",
            type: field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase(),
            value: field.value,
            message: field.validationMessage,
            validity: field.validity,
            element: field
        }));
        console.groupEnd();
    }

    private bindTextCounters(page: HTMLElement): void {
        page.querySelectorAll<HTMLTextAreaElement>("textarea[maxlength]").forEach(field => {
            const counter = field.parentElement?.querySelector<HTMLElement>(":scope > small");
            if (!counter) return;
            const update = () => { counter.textContent = `${field.value.length}/${field.maxLength}`; };
            if (field.dataset.briefingCounterBound !== "true") {
                field.dataset.briefingCounterBound = "true";
                field.addEventListener("input", update);
            }
            update();
        });
    }
}
