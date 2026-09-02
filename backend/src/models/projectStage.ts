export const projectStageKeys = [
    "briefing",
    "layout",
    "project-development",
    "survey",
    "budgets-definitions",
    "executive-project",
    "final-delivery"
] as const;

export const projectStageStatuses = [
    "not-started",
    "in-progress",
    "awaiting-approval",
    "changes-requested",
    "in-change",
    "approved",
    "completed",
    "awaiting-client",
    "awaiting-supplier",
    "internal-review",
    "paused",
    "blocked"
] as const;

export type ProjectStageKey = typeof projectStageKeys[number];
export type ProjectStageStatus = typeof projectStageStatuses[number];
export interface ProjectStage { key: ProjectStageKey; status: ProjectStageStatus; }

export function isProjectStageKey(value: unknown): value is ProjectStageKey {
    return typeof value === "string" && (projectStageKeys as readonly string[]).includes(value);
}

export function isProjectStageStatus(value: unknown): value is ProjectStageStatus {
    return typeof value === "string" && (projectStageStatuses as readonly string[]).includes(value);
}

export function initialProjectStages(hasFilledBriefing: boolean): ProjectStage[] {
    return projectStageKeys.map((key, index) => ({
        key,
        status: index === 0 && hasFilledBriefing ? "awaiting-approval" : "not-started"
    }));
}

export function normalizedProjectStages(
    stages: ProjectStage[] | undefined,
    hasFilledBriefing: boolean
): ProjectStage[] {
    const statusByKey = new Map<ProjectStageKey, ProjectStageStatus>();
    stages?.forEach(stage => {
        if (isProjectStageKey(stage?.key) && isProjectStageStatus(stage?.status)) {
            statusByKey.set(stage.key, stage.status);
        }
    });
    return initialProjectStages(hasFilledBriefing).map(stage => ({
        key: stage.key,
        status: statusByKey.get(stage.key) ?? stage.status
    }));
}

export function projectStagesForProposal(
    stages: ProjectStage[] | undefined,
    hasFilledBriefing: boolean,
    stageKey: ProjectStageKey,
    status: ProjectStageStatus
): ProjectStage[] {
    const selectedIndex = projectStageKeys.indexOf(stageKey);
    return normalizedProjectStages(stages, hasFilledBriefing).map((stage, index) => {
        if (index < selectedIndex) return { ...stage, status: "completed" };
        if (stage.key === stageKey) return { ...stage, status };
        return stage;
    });
}
