interface CachedBriefingFiles {
    id: string;
    files: File[];
    savedAt: string;
}

export class BriefingFileRepository {
    private readonly databaseName = "marcella-sol-client-drafts";
    private readonly storeName = "files";

    async save(id: string, files: File[]): Promise<void> {
        const database = await this.openDatabase();
        try {
            await this.runTransaction(database, "readwrite", store => {
                if (files.length > 0) {
                    const record: CachedBriefingFiles = { id, files, savedAt: new Date().toISOString() };
                    store.put(record);
                } else {
                    store.delete(id);
                }
            });
        } finally {
            database.close();
        }
    }

    async load(id: string): Promise<File[]> {
        const database = await this.openDatabase();
        try {
            return await new Promise<File[]>((resolve, reject) => {
                const request = database.transaction(this.storeName, "readonly")
                    .objectStore(this.storeName)
                    .get(id);
                request.onsuccess = () => {
                    const record = request.result as CachedBriefingFiles | undefined;
                    resolve(record?.files ?? []);
                };
                request.onerror = () => reject(request.error);
            });
        } finally {
            database.close();
        }
    }

    async removeByPrefix(prefix: string): Promise<void> {
        const database = await this.openDatabase();
        try {
            await this.runTransaction(database, "readwrite", store => {
                const request = store.getAllKeys();
                request.onsuccess = () => {
                    request.result
                        .filter(key => typeof key === "string" && key.startsWith(prefix))
                        .forEach(key => store.delete(key));
                };
            });
        } finally {
            database.close();
        }
    }

    private openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(this.storeName)) {
                    request.result.createObjectStore(this.storeName, { keyPath: "id" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("O banco local de arquivos está bloqueado."));
        });
    }

    private runTransaction(
        database: IDBDatabase,
        mode: IDBTransactionMode,
        operation: (store: IDBObjectStore) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, mode);
            operation(transaction.objectStore(this.storeName));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }
}
