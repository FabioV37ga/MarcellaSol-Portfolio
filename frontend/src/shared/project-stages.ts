export const projectStageLabels = {
    briefing: "Briefing",
    survey: "Levantamento",
    layout: "Layout",
    "project-development": "Desenvolvimento do projeto",
    "budgets-definitions": "Orçamentos e definições",
    "executive-project": "Projeto executivo e detalhamentos",
    "final-delivery": "Entrega final"
} as const;

export const projectStageStatusLabels = {
    "not-started": "Não iniciada",
    "in-progress": "Em andamento",
    "awaiting-approval": "Aguardando aprovação",
    "changes-requested": "Alterações solicitadas",
    "in-change": "Em alteração",
    approved: "Aprovada",
    "awaiting-client": "Aguardando cliente",
    "awaiting-supplier": "Aguardando fornecedor",
    "internal-review": "Em revisão interna",
    paused: "Pausada",
    blocked: "Bloqueada"
} as const;

export type ProjectStageKey = keyof typeof projectStageLabels;
export type ProjectStageStatus = keyof typeof projectStageStatusLabels;
export interface ProjectStage { key: ProjectStageKey; status: ProjectStageStatus; }

function isProjectStageStatus(value: string): value is ProjectStageStatus {
    return Object.prototype.hasOwnProperty.call(projectStageStatusLabels, value);
}

export function renderProjectStages(
    root: ParentNode = document,
    stages?: ProjectStage[],
    currentStageKey?: ProjectStageKey
): void {
    const statusByKey = new Map(stages?.map(stage => [stage.key, stage.status]));
    const elements = Array.from(root.querySelectorAll<HTMLElement>(".project-step"));

    elements.forEach(element => {
        const key = element.dataset.stageKey as ProjectStageKey | undefined;
        const suppliedStatus = key ? statusByKey.get(key) : undefined;
        const rawStatus = suppliedStatus ?? element.dataset.status?.trim().toLowerCase() ?? "not-started";
        const status: ProjectStageStatus = isProjectStageStatus(rawStatus) ? rawStatus : "not-started";
        const isCurrent = currentStageKey ? key === currentStageKey : element.classList.contains("project-step-active");
        const statusElement = element.querySelector<HTMLElement>(".project-step-status");
        const stageLabel = element.querySelector<HTMLElement>(".project-step-label")?.textContent?.trim() ?? "Etapa";

        element.dataset.status = status;
        element.classList.toggle("project-step-active", isCurrent);
        element.toggleAttribute("aria-current", isCurrent);
        if (isCurrent) element.setAttribute("aria-current", "step");
        if (statusElement) {
            statusElement.textContent = projectStageStatusLabels[status];
            statusElement.toggleAttribute("role", isCurrent);
            if (isCurrent) statusElement.setAttribute("role", "status");
        }
        element.setAttribute("aria-label", `${stageLabel}: ${projectStageStatusLabels[status]}`);
    });

    const currentStage = elements.find(element => element.classList.contains("project-step-active"));
    const currentIndex = currentStage ? elements.indexOf(currentStage) : -1;
    const track = root.querySelector<HTMLElement>(".project-progress-track");
    if (track && currentIndex >= 0) {
        track.style.setProperty("--steps", String(elements.length));
        track.style.setProperty("--current-step", String(currentIndex + 1));
        track.style.setProperty("--progress", `${currentIndex / elements.length * 100}%`);
    }
    const summary = root.querySelector<HTMLElement>("[data-project-progress-summary]");
    if (!currentStage || !summary) return;
    const label = currentStage.querySelector<HTMLElement>(".project-step-label")?.textContent?.trim() ?? "Etapa atual";
    const status = currentStage.dataset.status as ProjectStageStatus;
    summary.textContent = `${label} — ${projectStageStatusLabels[status].toLowerCase()}.`;
}
