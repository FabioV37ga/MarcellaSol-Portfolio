export interface BriefingHistoryOptions {
    pushHistory?: boolean;
    replaceHistory?: boolean;
}

interface BriefingNavigatorOptions {
    onPageShown: (page: HTMLElement) => void;
    onPageChanged: () => void;
}

export class BriefingNavigator {
    private activePage = 0;

    constructor(
        private readonly template: HTMLElement,
        private readonly pages: HTMLElement[],
        private readonly options: BriefingNavigatorOptions
    ) {}

    get currentPage(): number {
        return this.activePage;
    }

    back(): void {
        if (this.activePage <= 0) return;
        this.show(this.activePage - 1, { replaceHistory: true });
    }

    show(index: number, historyOptions: BriefingHistoryOptions = {}): void {
        if (index < 0 || index >= this.pages.length) return;

        const page = this.pages[index];
        const progress = this.template.querySelector<HTMLElement>(".progress");
        if (!page || !progress) return;

        this.activePage = index;
        this.pages.forEach((candidate, candidateIndex) => {
            const isCurrentPage = candidateIndex === index;
            candidate.hidden = !isCurrentPage;
            candidate.setAttribute("aria-hidden", String(!isCurrentPage));

            candidate.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
                "input, select, textarea, button"
            ).forEach(field => {
                if (!isCurrentPage) {
                    if (field.dataset.briefingDisabledBeforeHide === undefined) {
                        field.dataset.briefingDisabledBeforeHide = String(field.disabled);
                    }
                    field.disabled = true;
                    return;
                }

                const wasDisabled = field.dataset.briefingDisabledBeforeHide === "true";
                field.disabled = wasDisabled;
                delete field.dataset.briefingDisabledBeforeHide;
            });
        });

        progress.setAttribute("aria-valuemax", String(this.pages.length));
        progress.setAttribute("aria-valuenow", String(index + 1));
        progress.style.setProperty("--briefing-progress", `${((index + 1) / this.pages.length) * 100}%`);
        this.syncActiveSection(page);
        this.options.onPageShown(page);

        const historyState = { page: "briefing", briefingStep: index };
        if (historyOptions.replaceHistory) {
            window.history.replaceState(historyState, "");
        } else if (historyOptions.pushHistory ?? true) {
            window.history.pushState(historyState, "");
        }

        this.options.onPageChanged();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    private syncActiveSection(page: HTMLElement): void {
        const pageKey = page.dataset.briefingPageKey ?? "";
        let section = "environments";

        if (pageKey === "welcome") section = "welcome";
        else if (pageKey.startsWith("about-")) section = "about";
        else if (pageKey === "routine") section = "routine";
        else if (pageKey === "investment") section = "investment";
        else if (pageKey.startsWith("preferences-")) section = "preferences";
        else if (pageKey === "ending") section = "ending";

        this.template.querySelectorAll<HTMLElement>("[data-briefing-index]").forEach(item => {
            const isActive = item.dataset.briefingIndex === section;
            item.classList.toggle("is-active", isActive);
            if (isActive) item.setAttribute("aria-current", "step");
            else item.removeAttribute("aria-current");
        });
    }
}
