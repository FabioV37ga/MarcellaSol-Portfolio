export interface CollectionPosition<T> {
    key: string;
    index: number;
    item: T;
}

export interface CollectionUpdate<T> extends CollectionPosition<T> {
    previous: T;
}

export interface CollectionMove<T> {
    key: string;
    fromIndex: number;
    toIndex: number;
    item: T;
}

export interface CollectionDelta<T> {
    inserted: CollectionPosition<T>[];
    updated: CollectionUpdate<T>[];
    removed: CollectionPosition<T>[];
    moved: CollectionMove<T>[];
    unchanged: CollectionPosition<T>[];
}

export interface CollectionReconciliation<T> {
    keyOf: (item: T) => string;
    visuallyEqual: (previous: T, next: T) => boolean;
}

export function reconcileCollection<T>(
    previous: readonly T[],
    next: readonly T[],
    reconciliation: CollectionReconciliation<T>
): CollectionDelta<T> {
    const previousItems = indexedItems(previous, reconciliation.keyOf, "anterior");
    const nextItems = indexedItems(next, reconciliation.keyOf, "nova");
    const delta: CollectionDelta<T> = {
        inserted: [],
        updated: [],
        removed: [],
        moved: [],
        unchanged: []
    };

    previousItems.forEach(({ item, index }, key) => {
        if (!nextItems.has(key)) delta.removed.push({ key, index, item });
    });

    nextItems.forEach(({ item, index }, key) => {
        const former = previousItems.get(key);
        if (!former) {
            delta.inserted.push({ key, index, item });
            return;
        }
        if (former.index !== index) {
            delta.moved.push({ key, fromIndex: former.index, toIndex: index, item });
        }
        if (reconciliation.visuallyEqual(former.item, item)) {
            delta.unchanged.push({ key, index, item });
        } else {
            delta.updated.push({ key, index, item, previous: former.item });
        }
    });

    return delta;
}

function indexedItems<T>(
    items: readonly T[],
    keyOf: (item: T) => string,
    collectionName: string
): Map<string, { item: T; index: number }> {
    const indexed = new Map<string, { item: T; index: number }>();
    items.forEach((item, index) => {
        const key = keyOf(item).trim();
        if (!key) throw new Error(`A coleção ${collectionName} contém uma identidade vazia no índice ${index}`);
        if (indexed.has(key)) throw new Error(`A coleção ${collectionName} contém a identidade duplicada "${key}"`);
        indexed.set(key, { item, index });
    });
    return indexed;
}

