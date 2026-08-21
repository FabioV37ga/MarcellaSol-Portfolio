import u from "umbrellajs";

export class ClientSystemView {
    constructor() {
        this.dismissLogin();
    }

    private dismissLogin(): void {
        const login = u(".client-login").first();

        if (login) {
            login.remove();
        }
    }

    render(section: HTMLElement, target: string): void {
        const container = u(target).first() as HTMLElement | undefined;

        if (!container) {
            throw new Error(`Container ${target} não encontrado.`);
        }

        if (target !== "body") {
            this.unrender();
        }

        container.append(section);
    }

    private unrender(): void {
        const container = u(".page-content").first() as HTMLElement | undefined;
        container?.replaceChildren();
    }

    styleNavButton(button?: HTMLElement): void {
        u(".desktop-nav-item-selected").removeClass("desktop-nav-item-selected");

        if (button) {
            u(button).addClass("desktop-nav-item-selected");
        }
    }
}
