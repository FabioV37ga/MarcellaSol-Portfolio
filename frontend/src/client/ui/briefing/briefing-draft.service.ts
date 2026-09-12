import type {
    BriefingDraftRepository,
    CachedBriefingDraft,
    CachedBriefingField
} from "../../infrastructure/briefing/briefing-draft.repository.js";

type BriefingField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type BriefingDraftStore = Pick<BriefingDraftRepository, "save" | "load" | "remove">;

export class BriefingDraftService {
    constructor(private readonly drafts: BriefingDraftStore) { }

    isCacheableField(target: EventTarget | null): target is BriefingField {
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
            return false;
        }

        return !(target instanceof HTMLInputElement && (target.type === "file" || target.type === "password"));
    }

    save(pages: HTMLElement[], currentPage: number): void {
        const fields: CachedBriefingField[] = [];

        pages.forEach(page => {
            const pageKey = this.pageKey(page);
            const pageFields = this.fields(page);
            const stableKeys = pageFields.map(field => this.stableKey(field));
            pageFields.forEach((field, fieldIndex) => {
                if (!this.isCacheableField(field)) return;

                const type = field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase();
                const answerKey = stableKeys[fieldIndex];
                const hasUniqueAnswerKey = answerKey !== undefined
                    && stableKeys.filter(candidate => candidate === answerKey).length === 1;
                const value = field instanceof HTMLSelectElement && field.multiple
                    ? Array.from(field.selectedOptions).map(option => option.value)
                    : field.value;
                const checked = field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")
                    ? field.checked
                    : undefined;

                fields.push({
                    pageKey,
                    fieldIndex,
                    ...(hasUniqueAnswerKey ? { answerKey } : {}),
                    type,
                    value,
                    checked
                });
            });
        });

        this.drafts.save({ version: 1, currentPage, fields });
    }

    restore(pages: HTMLElement[]): number {
        const draft = this.drafts.load();
        if (!draft) return 0;

        const pagesByKey = new Map(pages.map(page => [this.pageKey(page), page]));
        draft.fields.forEach(cachedField => this.restoreField(pagesByKey.get(cachedField.pageKey), cachedField));

        return this.restoredPage(draft, pages.length);
    }

    remove(): void {
        this.drafts.remove();
    }

    private restoreField(page: HTMLElement | undefined, cachedField: CachedBriefingField): void {
        const pageFields = page ? this.fields(page) : [];
        const field = cachedField.answerKey
            ? pageFields.find(candidate => this.stableKey(candidate) === cachedField.answerKey)
            : pageFields[cachedField.fieldIndex];
        if (!field || !this.isCacheableField(field)) return;

        const currentType = field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase();
        if (currentType !== cachedField.type) return;

        if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
            field.checked = Boolean(cachedField.checked);
        } else if (field instanceof HTMLSelectElement && field.multiple && Array.isArray(cachedField.value)) {
            const selectedValues = new Set(cachedField.value);
            Array.from(field.options).forEach(option => option.selected = selectedValues.has(option.value));
        } else if (typeof cachedField.value === "string") {
            field.value = cachedField.value;
        }
    }

    private restoredPage(draft: CachedBriefingDraft, pageCount: number): number {
        if (!Number.isInteger(draft.currentPage) || pageCount === 0) return 0;
        return Math.min(Math.max(draft.currentPage, 0), pageCount - 1);
    }

    private fields(page: HTMLElement): BriefingField[] {
        return Array.from(page.querySelectorAll<BriefingField>("input, select, textarea"));
    }

    private pageKey(page: HTMLElement): string {
        return page.dataset.briefingPageKey ?? page.className;
    }

    private stableKey(field: BriefingField): string | undefined {
        const declaredKey = field.dataset.briefingAnswerKey?.trim();
        if (declaredKey) return `data:${declaredKey}`;
        if (field.id) return `id:${field.id}`;
        if (!field.name) return undefined;

        if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
            return `name:${field.name}:value:${field.value}`;
        }
        return `name:${field.name}`;
    }
}
