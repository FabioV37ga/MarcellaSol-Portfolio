import { SessionVisualCache, visualCacheKey } from "./session-visual-cache.js";
import type { RevalidationResult, VisualCacheQuery } from "./visual-cache.types.js";

export interface VisualRevalidation<T> {
    query: VisualCacheQuery;
    load: () => Promise<T>;
    presentPreview?: (snapshot: T) => void;
    publish: (snapshot: T, previous: T | undefined) => void;
    reportError?: (error: unknown, context: { hasPreview: boolean }) => void;
}

export class VisualPersistenceController {
    private readonly generations = new Map<string, number>();
    private disposed = false;

    constructor(private readonly cache: SessionVisualCache) { }

    async revalidate<T>(operation: VisualRevalidation<T>): Promise<RevalidationResult<T>> {
        if (this.disposed) throw new Error("O controlador de persistência visual foi descartado");
        const key = visualCacheKey(operation.query);
        const generation = (this.generations.get(key) ?? 0) + 1;
        this.generations.set(key, generation);
        const preview = this.cache.get<T>(operation.query);
        const hadPreview = preview !== undefined;
        if (preview !== undefined) operation.presentPreview?.(preview);

        try {
            const fresh = await operation.load();
            if (!this.isCurrent(key, generation)) return { status: "stale", hadPreview };
            this.cache.set(operation.query, fresh);
            const published = this.cache.get<T>(operation.query)!;
            operation.publish(published, preview);
            return { status: "published", value: published, hadPreview };
        } catch (error) {
            if (!this.isCurrent(key, generation)) return { status: "stale", hadPreview };
            operation.reportError?.(error, { hasPreview: hadPreview });
            return { status: "failed", error, hadPreview };
        }
    }

    cancel(query: VisualCacheQuery): void {
        const key = visualCacheKey(query);
        this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    }

    remember<T>(query: VisualCacheQuery, snapshot: T): void {
        if (this.disposed) throw new Error("O controlador de persistência visual foi descartado");
        this.cache.set(query, snapshot);
    }

    invalidate(query: VisualCacheQuery): void {
        this.cancel(query);
        this.cache.delete(query);
    }

    clear(): void {
        this.generations.clear();
        this.cache.clear();
    }

    dispose(): void {
        this.disposed = true;
        this.clear();
    }

    private isCurrent(key: string, generation: number): boolean {
        return !this.disposed && this.generations.get(key) === generation;
    }
}
