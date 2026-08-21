export interface CachedBriefingField {
    pageKey: string;
    fieldIndex: number;
    type: string;
    value: string | string[];
    checked?: boolean;
}

export interface CachedBriefingDraft {
    version: 1;
    currentPage: number;
    fields: CachedBriefingField[];
}

export class BriefingDraftRepository {
    constructor(private readonly storageKey: string) {}

    save(draft: CachedBriefingDraft): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(draft));
        } catch (error) {
            console.warn("Briefing: não foi possível salvar o rascunho local.", error);
        }
    }

    load(): CachedBriefingDraft | undefined {
        try {
            const serializedDraft = localStorage.getItem(this.storageKey);
            if (!serializedDraft) return undefined;

            const draft = JSON.parse(serializedDraft) as CachedBriefingDraft;
            return draft?.version === 1 && Array.isArray(draft.fields) ? draft : undefined;
        } catch (error) {
            console.warn("Briefing: o rascunho local não pôde ser restaurado.", error);
            this.remove();
            return undefined;
        }
    }

    remove(): void {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn("Briefing: não foi possível remover o rascunho local.", error);
        }
    }
}
