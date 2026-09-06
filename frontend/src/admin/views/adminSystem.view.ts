import u from "umbrellajs";
import { DomViewLifecycle, type ViewDisposer } from "@/shared/views/dom-view-lifecycle.js";


export class AdminSystemView {
    private readonly lifecycle = new DomViewLifecycle();

    constructor() {
        // console.log("Admin System View initialized.")

        this.dismissLogin()
        // this.render(home)
    }

    dismissLogin() {
        var login = u(".admin-login").first() as HTMLElement
        login.remove()
    }

    render(section: HTMLElement, target: string): HTMLElement {
        return this.lifecycle.render(section, target);
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

    styleNavButton(button: HTMLElement){
        // console.log("style")
        const selected = u(".desktop-nav-item-selected").first() as HTMLElement
        u(selected).removeClass("desktop-nav-item-selected")
        // console.log(selected)

        // console.log(button)
        u(button).addClass("desktop-nav-item-selected")
    }
}
