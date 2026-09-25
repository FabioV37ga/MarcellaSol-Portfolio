import type {
    VisualCacheQuery,
    VisualCacheScope,
    VisualCacheSnapshot
} from "./visual-cache.types.js";

interface StoredSnapshot {
    query: VisualCacheQuery;
    value: unknown;
}

export class SessionVisualCache {
    private readonly snapshots = new Map<string, StoredSnapshot>();

    constructor(private readonly scope: VisualCacheScope) {
        if (!scope.subjectId.trim()) throw new Error("A identidade da sessão visual é obrigatória");
    }

    get<T>(query: VisualCacheQuery): T | undefined {
        const snapshot = this.snapshots.get(visualCacheKey(query));
        return snapshot ? cloneSnapshotValue(snapshot.value as T) : undefined;
    }

    set<T>(query: VisualCacheQuery, value: T): void {
        this.snapshots.set(visualCacheKey(query), {
            query: normalizedQuery(query),
            value: cloneSnapshotValue(value)
        });
    }

    delete(query: VisualCacheQuery): boolean {
        return this.snapshots.delete(visualCacheKey(query));
    }

    invalidate(predicate: (snapshot: VisualCacheSnapshot<unknown>) => boolean): number {
        let removed = 0;
        this.snapshots.forEach((snapshot, key) => {
            const candidate = {
                scope: { ...this.scope },
                query: normalizedQuery(snapshot.query),
                value: cloneSnapshotValue(snapshot.value)
            };
            if (!predicate(candidate)) return;
            this.snapshots.delete(key);
            removed += 1;
        });
        return removed;
    }

    clear(): void {
        this.snapshots.clear();
    }
}

export function visualCacheKey(query: VisualCacheQuery): string {
    if (!query.screen.trim()) throw new Error("A tela do snapshot visual é obrigatória");
    if (!Number.isInteger(query.schemaVersion) || query.schemaVersion < 1) {
        throw new Error("A versão do snapshot visual deve ser um inteiro positivo");
    }
    const parameters = Object.entries(query.parameters ?? {})
        .filter((entry): entry is [string, Exclude<typeof entry[1], undefined>] => entry[1] !== undefined)
        .sort(([left], [right]) => left.localeCompare(right));
    return JSON.stringify([query.screen, query.schemaVersion, parameters]);
}

function normalizedQuery(query: VisualCacheQuery): VisualCacheQuery {
    return {
        screen: query.screen,
        schemaVersion: query.schemaVersion,
        ...(query.parameters ? { parameters: { ...query.parameters } } : {})
    };
}

function cloneSnapshotValue<T>(value: T): T {
    return structuredClone(value);
}

