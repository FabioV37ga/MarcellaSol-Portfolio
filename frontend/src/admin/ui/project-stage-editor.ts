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

export class ProjectStageEditor {
    private stages: ProjectStage[];
    private currentStageKey: ProjectStageKey;
    private selectedStageKey?: ProjectStageKey;
    private saving = false;
    private readonly selector: HTMLElement;
    private readonly selectorStageName: HTMLElement;
    private readonly feedback: HTMLElement;

    constructor(
        private readonly root: HTMLElement,
        stages: ProjectStage[],
        currentStageKey: ProjectStageKey,
        private readonly save: SaveProjectStage,
        private readonly onSaved: (result: ProjectStageEditorResult) => void
    ) {
        this.stages = stages;
        this.currentStageKey = currentStageKey;
        this.selector = this.requiredElement("#project-stage-status-selector");
        this.selectorStageName = this.requiredElement("#project-stage-status-name");
        this.feedback = this.requiredElement("#project-stage-feedback");
        this.mountControls();
        this.render();
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
                if (!this.saving) this.toggleSelector(stageKey);
            });
        });

        this.selector.querySelectorAll<HTMLButtonElement>(".project-stage-status-option").forEach(option => {
            option.addEventListener("click", event => {
                event.stopPropagation();
                const status = option.dataset.stageStatus as ProjectStageStatus;
                if (this.selectedStageKey) void this.selectStatus(this.selectedStageKey, status);
            });
        });

        this.root.addEventListener("click", event => {
            const target = event.target as Element;
            if (!target.closest(".project-step") && !target.closest("#project-stage-status-selector")) {
                this.closeSelector();
            }
        });
        this.root.addEventListener("keydown", event => {
            if (event.key === "Escape") this.closeSelector();
        });
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
        const step = this.root.querySelector<HTMLElement>(`.project-step[data-stage-key="${stageKey}"]`);
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
            this.setFeedback(
                `${projectStageLabels[stageKey]} atualizada para “${projectStageStatusLabels[status]}”.`,
                false
            );
            this.onSaved(result);
        } catch (error: unknown) {
            this.setFeedback(
                error instanceof Error ? error.message : "Não foi possível salvar o status da etapa.",
                true
            );
        } finally {
            this.saving = false;
            this.setBusy(false);
        }
    }

    private render(): void {
        renderProjectStages(this.root, this.stages, this.currentStageKey);
        const statusByKey = new Map(this.stages.map(stage => [stage.key, stage.status]));

        this.root.querySelectorAll<HTMLElement>(".project-step").forEach(step => {
            const stageKey = step.dataset.stageKey as ProjectStageKey;
            const status = statusByKey.get(stageKey) ?? "not-started";
            step.setAttribute(
                "aria-label",
                `Alterar ${projectStageLabels[stageKey]}. Status atual: ${projectStageStatusLabels[status]}`
            );
        });
        if (this.selectedStageKey) this.syncSelectedStatus(this.selectedStageKey);
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
            ".project-step, .project-stage-status-option"
        ).forEach(button => { button.disabled = busy; });
    }

    private setFeedback(message: string, error: boolean): void {
        this.feedback.textContent = message;
        this.feedback.classList.toggle("project-stage-feedback-error", error);
    }
}
