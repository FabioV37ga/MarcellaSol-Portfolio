import {
    projectStageLabels,
    projectStageStatusLabels,
    renderProjectStages,
    type ProjectStage,
    type ProjectStageKey,
    type ProjectStageStatus
} from "@/shared/project-stages.js";

export interface ProjectStageEditorResult {
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
}

type SaveProjectStage = (
    stageKey: ProjectStageKey,
    status: ProjectStageStatus
) => Promise<ProjectStageEditorResult>;

type SaveProjectStageOrder = (
    stageKeys: ProjectStageKey[]
) => Promise<ProjectStageEditorResult>;

export class ProjectStageEditor {
    private stages: ProjectStage[];
    private currentStageKey: ProjectStageKey;
    private selectedStageKey?: ProjectStageKey;
    private selectedOrderStageKey?: ProjectStageKey;
    private draggedStageKey?: ProjectStageKey;
    private draftStageKeys: ProjectStageKey[];
    private saving = false;
    private ordering = false;
    private orderConfigured: boolean;
    private readonly selector: HTMLElement;
    private readonly selectorStageName: HTMLElement;
    private readonly feedback: HTMLElement;
    private readonly editOrderButton: HTMLButtonElement;
    private readonly orderPanel: HTMLElement;
    private readonly orderSelectedName: HTMLElement;
    private readonly movePreviousButton: HTMLButtonElement;
    private readonly moveNextButton: HTMLButtonElement;
    private readonly saveOrderButton: HTMLButtonElement;
    private readonly cancelOrderButton: HTMLButtonElement;

    constructor(
        private readonly root: HTMLElement,
        stages: ProjectStage[],
        currentStageKey: ProjectStageKey,
        orderConfigured: boolean,
        private readonly save: SaveProjectStage,
        private readonly saveOrder: SaveProjectStageOrder,
        private readonly onSaved: (result: ProjectStageEditorResult) => void
    ) {
        this.stages = stages;
        this.currentStageKey = currentStageKey;
        this.draftStageKeys = stages.map(stage => stage.key);
        this.orderConfigured = orderConfigured;
        this.selector = this.requiredElement("#project-stage-status-selector");
        this.selectorStageName = this.requiredElement("#project-stage-status-name");
        this.feedback = this.requiredElement("#project-stage-feedback");

        this.editOrderButton = this.requiredElement("#project-stage-order-edit");
        this.orderPanel = this.requiredElement("#project-stage-order-panel");
        this.orderSelectedName = this.requiredElement("[data-stage-order-selected]");
        this.movePreviousButton = this.requiredElement("[data-stage-order-previous]");
        this.moveNextButton = this.requiredElement("[data-stage-order-next]");
        this.saveOrderButton = this.requiredElement("[data-stage-order-save]");
        this.cancelOrderButton = this.requiredElement("[data-stage-order-cancel]");
        stages.forEach(stage => {
            this.requiredElement(`.project-step[data-stage-key="${stage.key}"]`);
        });

        this.render();
        this.mountControls();
        this.setInitialContentVisibility();
        if (!this.orderConfigured) this.startOrdering();
    }

    replaceState(result: ProjectStageEditorResult): void {
        this.stages = result.projectStages;
        this.currentStageKey = result.currentStageKey;
        this.draftStageKeys = result.projectStages.map(stage => stage.key);
        this.render();
        this.closeSelector();
        this.onSaved(result);
    }

    private requiredElement<T extends HTMLElement = HTMLElement>(selector: string): T {
        const element = this.root.querySelector<T>(selector);
        if (!element) throw new Error(`A view client-proposals está desatualizada: ${selector} não foi encontrado.`);
        return element;
    }

    private mountControls(): void {
        this.root.querySelectorAll<HTMLButtonElement>(".project-step").forEach(step => {
            const stageKey = step.dataset.stageKey as ProjectStageKey;
            step.addEventListener("click", event => {
                event.stopPropagation();
                if (this.saving) return;
                if (this.ordering) {
                    this.selectOrderStage(stageKey);
                    return;
                }
                if (stageKey !== "contract") this.toggleSelector(stageKey);
            });
            step.addEventListener("dragstart", event => this.startDrag(event, stageKey));
            step.addEventListener("dragover", event => this.dragOver(event, stageKey));
            step.addEventListener("drop", event => event.preventDefault());
            step.addEventListener("dragend", () => this.finishDrag());
            step.addEventListener("keydown", event => {
                if (!this.ordering || !event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
                event.preventDefault();
                this.selectOrderStage(stageKey);
                this.moveSelectedOrderStage(event.key === "ArrowLeft" ? -1 : 1);
            });
        });

        this.selector.querySelectorAll<HTMLButtonElement>(".project-stage-status-option").forEach(option => {
            option.addEventListener("click", event => {
                event.stopPropagation();
                const status = option.dataset.stageStatus as ProjectStageStatus;
                if (this.selectedStageKey) void this.selectStatus(this.selectedStageKey, status);
            });
        });

        this.editOrderButton.addEventListener("click", () => this.startOrdering());
        this.movePreviousButton.addEventListener("click", () => this.moveSelectedOrderStage(-1));
        this.moveNextButton.addEventListener("click", () => this.moveSelectedOrderStage(1));
        this.saveOrderButton.addEventListener("click", () => void this.persistOrder());
        this.cancelOrderButton.addEventListener("click", () => this.cancelOrdering());

        this.root.addEventListener("click", event => {
            const target = event.target as Element;
            if (!target.closest(".project-step") && !target.closest("#project-stage-status-selector")) {
                this.closeSelector();
            }
        });
        this.root.addEventListener("keydown", event => {
            if (event.key === "Escape" && !this.ordering) this.closeSelector();
        });
    }

    private startOrdering(): void {
        this.closeSelector();
        this.ordering = true;
        this.draftStageKeys = this.stages.map(stage => stage.key);
        this.selectedOrderStageKey = undefined;
        this.root.classList.add("project-stage-ordering");
        this.orderPanel.hidden = false;
        this.editOrderButton.hidden = true;
        this.cancelOrderButton.hidden = !this.orderConfigured;
        this.setDependentContentVisibility(false);
        this.setFeedback(
            this.orderConfigured ? "Ajuste a ordem e salve para aplicar a alteração." : "Defina a ordem das etapas para continuar.",
            false
        );
        this.renderOrderDraft();
    }

    private cancelOrdering(): void {
        if (!this.orderConfigured || this.saving) return;
        this.ordering = false;
        this.selectedOrderStageKey = undefined;
        this.draftStageKeys = this.stages.map(stage => stage.key);
        this.root.classList.remove("project-stage-ordering");
        this.orderPanel.hidden = true;
        this.editOrderButton.hidden = false;
        this.setDependentContentVisibility(true);
        this.setFeedback("Ordem mantida sem alterações.", false);
        this.render();
    }

    private selectOrderStage(stageKey: ProjectStageKey): void {
        if (this.isFixedStage(stageKey)) return;
        this.selectedOrderStageKey = stageKey;
        this.syncOrderSelection();
    }

    private moveSelectedOrderStage(direction: -1 | 1): void {
        const stageKey = this.selectedOrderStageKey;
        if (!stageKey) return;
        const currentIndex = this.draftStageKeys.indexOf(stageKey);
        const nextIndex = currentIndex + direction;
        if (nextIndex < 2 || nextIndex >= this.draftStageKeys.length) return;
        this.draftStageKeys.splice(currentIndex, 1);
        this.draftStageKeys.splice(nextIndex, 0, stageKey);
        this.renderOrderDraft();
        this.focusStage(stageKey);
    }

    private startDrag(event: DragEvent, stageKey: ProjectStageKey): void {
        if (!this.ordering || this.isFixedStage(stageKey)) {
            event.preventDefault();
            return;
        }
        this.draggedStageKey = stageKey;
        this.selectOrderStage(stageKey);
        event.dataTransfer?.setData("text/plain", stageKey);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        (event.currentTarget as HTMLElement).classList.add("project-step-dragging");
    }

    private dragOver(event: DragEvent, targetKey: ProjectStageKey): void {
        const draggedKey = this.draggedStageKey;
        if (!this.ordering || !draggedKey || this.isFixedStage(targetKey) || draggedKey === targetKey) return;
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        const before = event.clientX < target.getBoundingClientRect().left + target.offsetWidth / 2;
        const withoutDragged = this.draftStageKeys.filter(key => key !== draggedKey);
        let targetIndex = withoutDragged.indexOf(targetKey) + (before ? 0 : 1);
        targetIndex = Math.max(2, targetIndex);
        withoutDragged.splice(targetIndex, 0, draggedKey);
        if (withoutDragged.join() === this.draftStageKeys.join()) return;
        this.draftStageKeys = withoutDragged;
        this.renderOrderDraft();
    }

    private finishDrag(): void {
        this.draggedStageKey = undefined;
        this.root.querySelectorAll(".project-step-dragging").forEach(step => {
            step.classList.remove("project-step-dragging");
        });
    }

    private async persistOrder(): Promise<void> {
        if (this.saving) return;
        this.saving = true;
        this.setBusy(true);
        this.setFeedback("Salvando ordem das etapas...", false);
        try {
            const result = await this.saveOrder([...this.draftStageKeys]);
            this.stages = result.projectStages;
            this.currentStageKey = result.currentStageKey;
            this.draftStageKeys = result.projectStages.map(stage => stage.key);
            this.orderConfigured = true;
            this.ordering = false;
            this.selectedOrderStageKey = undefined;
            this.root.classList.remove("project-stage-ordering");
            this.orderPanel.hidden = true;
            this.editOrderButton.hidden = false;
            this.setDependentContentVisibility(true);
            this.render();
            this.setFeedback("Ordem das etapas salva com sucesso.", false);
            this.onSaved(result);
        } catch (error: unknown) {
            this.setFeedback(error instanceof Error ? error.message : "Não foi possível salvar a ordem das etapas.", true);
        } finally {
            this.saving = false;
            this.setBusy(false);
        }
    }

    private toggleSelector(stageKey: ProjectStageKey): void {
        if (this.selectedStageKey === stageKey && this.selector.hidden === false) {
            this.closeSelector();
            return;
        }

        this.closeSelector();
        this.selectedStageKey = stageKey;
        this.selectorStageName.textContent = projectStageLabels[stageKey];
        this.selector.hidden = false;
        const step = this.stageElement(stageKey);
        step?.classList.add("project-step-selector-open");
        step?.setAttribute("aria-expanded", "true");
        this.syncSelectedStatus(stageKey);
    }

    private async selectStatus(stageKey: ProjectStageKey, status: ProjectStageStatus): Promise<void> {
        if (this.saving) return;
        this.saving = true;
        this.setBusy(true);
        this.setFeedback("Salvando alteração...", false);

        try {
            const result = await this.save(stageKey, status);
            this.stages = result.projectStages;
            this.currentStageKey = result.currentStageKey;
            this.render();
            this.closeSelector();
            this.setFeedback(`${projectStageLabels[stageKey]} atualizada para “${projectStageStatusLabels[status]}”.`, false);
            this.onSaved(result);
        } catch (error: unknown) {
            this.setFeedback(error instanceof Error ? error.message : "Não foi possível salvar o status da etapa.", true);
        } finally {
            this.saving = false;
            this.setBusy(false);
        }
    }

    private render(stageState: ProjectStage[] = this.stages): void {
        renderProjectStages(this.root, stageState, this.currentStageKey);
        const statusByKey = new Map(stageState.map(stage => [stage.key, stage.status]));

        this.root.querySelectorAll<HTMLElement>(".project-step").forEach(step => {
            const stageKey = step.dataset.stageKey as ProjectStageKey;
            const status = statusByKey.get(stageKey) ?? "not-started";
            const fixed = this.isFixedStage(stageKey);
            step.draggable = this.ordering && !fixed;
            step.classList.toggle("project-step-order-fixed", this.ordering && fixed);
            step.classList.toggle("project-step-order-selected", this.ordering && stageKey === this.selectedOrderStageKey);
            step.setAttribute("aria-label", this.ordering
                ? fixed
                    ? `${projectStageLabels[stageKey]}. Posição fixa.`
                    : `${projectStageLabels[stageKey]}. Selecione para alterar sua posição.`
                : stageKey === "contract"
                    ? "Contrato. Etapa visual concluída automaticamente."
                    : `Alterar ${projectStageLabels[stageKey]}. Status atual: ${projectStageStatusLabels[status]}`
            );
        });
        if (this.selectedStageKey) this.syncSelectedStatus(this.selectedStageKey);
        if (this.ordering) this.syncOrderSelection();
    }

    private renderOrderDraft(): void {
        const stageByKey = new Map(this.stages.map(stage => [stage.key, stage]));
        const draft = this.draftStageKeys.map((key, index) => ({ ...stageByKey.get(key)!, index }));
        this.render(draft);
    }

    private syncOrderSelection(): void {
        const selectedIndex = this.selectedOrderStageKey
            ? this.draftStageKeys.indexOf(this.selectedOrderStageKey) : -1;
        this.orderSelectedName.textContent = this.selectedOrderStageKey
            ? projectStageLabels[this.selectedOrderStageKey] : "Nenhuma";
        this.movePreviousButton.disabled = this.saving || selectedIndex <= 2;
        this.moveNextButton.disabled = this.saving || selectedIndex < 2 || selectedIndex >= this.draftStageKeys.length - 1;
        this.root.querySelectorAll<HTMLElement>(".project-step").forEach(step => {
            step.classList.toggle("project-step-order-selected", step.dataset.stageKey === this.selectedOrderStageKey);
        });
    }

    private syncSelectedStatus(stageKey: ProjectStageKey): void {
        const status = this.stages.find(stage => stage.key === stageKey)?.status ?? "not-started";
        this.selector.querySelectorAll<HTMLButtonElement>(".project-stage-status-option").forEach(option => {
            const selected = option.dataset.stageStatus === status;
            option.setAttribute("aria-selected", String(selected));
            option.classList.toggle("project-stage-status-option-selected", selected);
        });
    }

    private closeSelector(): void {
        this.selector.hidden = true;
        this.selectedStageKey = undefined;
        this.root.querySelectorAll<HTMLElement>(".project-step").forEach(step => {
            step.classList.remove("project-step-selector-open");
            step.setAttribute("aria-expanded", "false");
        });
    }

    private setBusy(busy: boolean): void {
        this.root.setAttribute("aria-busy", String(busy));
        this.root.querySelectorAll<HTMLButtonElement>(
            ".project-step, .project-stage-status-option, .project-stage-order-panel button, .project-stage-order-edit"
        ).forEach(button => { button.disabled = busy; });
        if (!busy && this.ordering) this.syncOrderSelection();
    }

    private setInitialContentVisibility(): void {
        if (this.orderConfigured) return;
        this.setDependentContentVisibility(false);
    }

    private setDependentContentVisibility(visible: boolean): void {
        this.root.querySelectorAll<HTMLElement>(".proposals-columns, #proposals-feedback, .proposals-actions")
            .forEach(element => { element.hidden = !visible; });
    }

    private stageElement(stageKey: ProjectStageKey): HTMLElement | null {
        return this.root.querySelector<HTMLElement>(`.project-step[data-stage-key="${stageKey}"]`);
    }

    private focusStage(stageKey: ProjectStageKey): void {
        this.stageElement(stageKey)?.focus();
    }

    private isFixedStage(stageKey: ProjectStageKey): boolean {
        return stageKey === "contract" || stageKey === "briefing";
    }

    private setFeedback(message: string, error: boolean): void {
        this.feedback.textContent = message;
        this.feedback.classList.toggle("project-stage-feedback-error", error);
    }
}
