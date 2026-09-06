import u from "umbrellajs";
import { DomViewLifecycle, type ViewDisposer } from "@/shared/views/dom-view-lifecycle.js";

export class ClientSystemView {
    private readonly lifecycle = new DomViewLifecycle();

    constructor() {
        this.dismissLogin();
    }

    private dismissLogin(): void {
        const login = u(".client-login").first();

        if (login) {
            login.remove();
        }
    }

    render(section: HTMLElement, target: string): HTMLElement {
        return this.lifecycle.render(section, target);
    }

    mountOwned(section: HTMLElement, target: string): HTMLElement {
        return this.lifecycle.mountOwned(section, target);
    }

    registerDisposer(disposer: ViewDisposer, target = ".page-content"): void {
        this.lifecycle.registerDisposer(disposer, target);
    }

    unrender(target = ".page-content"): void {
        this.lifecycle.dispose(target);
    }

    dispose(): void {
        this.lifecycle.disposeAll();
    }

    styleNavButton(button?: HTMLElement): void {
        u(".desktop-nav-item-selected").removeClass("desktop-nav-item-selected");

        if (button) {
            u(button).addClass("desktop-nav-item-selected");
        }
    }
}
