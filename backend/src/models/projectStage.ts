export const projectStageKeys = [
    "contract",
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
export interface ProjectStage {
    key: ProjectStageKey;
    status: ProjectStageStatus;
    index?: number;
}

export function isProjectStageKey(value: unknown): value is ProjectStageKey {
    return typeof value === "string" && (projectStageKeys as readonly string[]).includes(value);
}

export function isProjectStageStatus(value: unknown): value is ProjectStageStatus {
    return typeof value === "string" && (projectStageStatuses as readonly string[]).includes(value);
}

export function initialProjectStages(hasFilledBriefing: boolean): ProjectStage[] {
    return projectStageKeys.map(key => ({
        key,
        status: key === "contract"
            ? "completed"
            : key === "briefing" && hasFilledBriefing ? "awaiting-approval" : "not-started"
    }));
}

export function hasConfiguredProjectStageOrder(stages: ProjectStage[] | undefined): boolean {
    if (!Array.isArray(stages) || stages.length !== projectStageKeys.length) return false;

    const stageByKey = new Map<ProjectStageKey, ProjectStage>();
    for (const stage of stages) {
        if (!isProjectStageKey(stage?.key) || stageByKey.has(stage.key)) return false;
        if (!Number.isInteger(stage.index) || stage.index! < 0 || stage.index! >= projectStageKeys.length) return false;
        stageByKey.set(stage.key, stage);
    }

    const indexes = new Set(stages.map(stage => stage.index));
    return indexes.size === projectStageKeys.length
        && stageByKey.get("contract")?.index === 0
        && stageByKey.get("briefing")?.index === 1;
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
    const hasConfiguredOrder = hasConfiguredProjectStageOrder(stages);
    const orderedKeys = hasConfiguredOrder
        ? [...stages!].sort((left, right) => left.index! - right.index!).map(stage => stage.key)
        : [...projectStageKeys];

    const defaults = new Map(initialProjectStages(hasFilledBriefing).map(stage => [stage.key, stage.status]));
    return orderedKeys.map((key, index) => ({
        key,
        status: statusByKey.get(key) ?? defaults.get(key)!,
        ...(hasConfiguredOrder ? { index } : {})
    }));
}

export function projectStagesWithOrder(
    stages: ProjectStage[] | undefined,
    hasFilledBriefing: boolean,
    orderedKeys: ProjectStageKey[]
): ProjectStage[] {
    const normalized = normalizedProjectStages(stages, hasFilledBriefing);
    const stageByKey = new Map(normalized.map(stage => [stage.key, stage]));
    return orderedKeys.map((key, index) => ({ ...stageByKey.get(key)!, index }));
}

export function projectStagesAfterBriefingSubmission(stages: ProjectStage[] | undefined): ProjectStage[] {
    return normalizedProjectStages(stages, true).map(stage => stage.key === "briefing" && stage.status === "not-started"
        ? { ...stage, status: "awaiting-approval" }
        : stage
    );
}

export function projectStagesForProposal(
    stages: ProjectStage[] | undefined,
    hasFilledBriefing: boolean,
    stageKey: ProjectStageKey,
    status: ProjectStageStatus
): ProjectStage[] {
    const normalized = normalizedProjectStages(stages, hasFilledBriefing);
    const selectedIndex = normalized.findIndex(stage => stage.key === stageKey);
    return normalized.map((stage, index) => {
        if (index < selectedIndex) return { ...stage, status: "completed" };
        if (stage.key === stageKey) return { ...stage, status };
        return stage;
    });
}
