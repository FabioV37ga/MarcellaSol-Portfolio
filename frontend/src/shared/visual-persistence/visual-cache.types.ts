export type AuthenticatedRole = "admin" | "client";

export interface VisualCacheScope {
    role: AuthenticatedRole;
    subjectId: string;
}

export type VisualCacheParameter = string | number | boolean | undefined;

export interface VisualCacheQuery {
    screen: string;
    schemaVersion: number;
    parameters?: Readonly<Record<string, VisualCacheParameter>>;
}

export interface VisualCacheSnapshot<T> {
    scope: VisualCacheScope;
    query: VisualCacheQuery;
    value: T;
}

export type RevalidationResult<T> =
    | { status: "published"; value: T; hadPreview: boolean }
    | { status: "stale"; hadPreview: boolean }
    | { status: "failed"; error: unknown; hadPreview: boolean };

