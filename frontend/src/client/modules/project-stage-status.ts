export const projectStageStatuses = {
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

export type ProjectStageStatus = keyof typeof projectStageStatuses;

function isProjectStageStatus(value: string): value is ProjectStageStatus {
    return Object.prototype.hasOwnProperty.call(projectStageStatuses, value);
}

export function renderProjectStageStatuses(root: ParentNode = document): void {
    const stages = Array.from(root.querySelectorAll<HTMLElement>(".project-step"));

    stages.forEach(stage => {
        const rawStatus = stage.dataset.status?.trim().toLowerCase() ?? "not-started";
        const status: ProjectStageStatus = isProjectStageStatus(rawStatus) ? rawStatus : "not-started";
        const statusElement = stage.querySelector<HTMLElement>(".project-step-status");
        const stageLabel = stage.querySelector<HTMLElement>(".project-step-label")?.textContent?.trim() ?? "Etapa";

        stage.dataset.status = status;
        if (statusElement) {
            statusElement.textContent = projectStageStatuses[status];
            if (stage.classList.contains("project-step-active")) statusElement.setAttribute("role", "status");
            else statusElement.removeAttribute("role");
        }
        stage.setAttribute("aria-label", `${stageLabel}: ${projectStageStatuses[status]}`);
    });

    const currentStage = stages.find(stage => stage.classList.contains("project-step-active"));
    const summary = root.querySelector<HTMLElement>("#project-progress-summary");
    if (!currentStage || !summary) return;

    const currentLabel = currentStage.querySelector<HTMLElement>(".project-step-label")?.textContent?.trim() ?? "Etapa atual";
    const currentStatus = currentStage.dataset.status as ProjectStageStatus;
    summary.textContent = `${currentLabel} — ${projectStageStatuses[currentStatus].toLowerCase()}.`;
}
