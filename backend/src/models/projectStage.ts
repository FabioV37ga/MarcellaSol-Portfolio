export const projectStageKeys = [
    "briefing",
    "survey",
    "layout",
    "project-development",
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
    "awaiting-client",
    "awaiting-supplier",
    "internal-review",
    "paused",
    "blocked"
] as const;

export type ProjectStageKey = typeof projectStageKeys[number];
export type ProjectStageStatus = typeof projectStageStatuses[number];
export interface ProjectStage { key: ProjectStageKey; status: ProjectStageStatus; }

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
    const statusByKey = new Map(stages?.map(stage => [stage.key, stage.status]));
    return initialProjectStages(hasFilledBriefing).map(stage => ({
        key: stage.key,
        status: statusByKey.get(stage.key) ?? stage.status
    }));
}
