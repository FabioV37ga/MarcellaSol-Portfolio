export type ClientRoute = "base" | "home" | "stages-approvals" | "financial" | "briefing";

export interface ClientPageState {
    scope?: "client";
    page: ClientRoute;
    briefingStep?: number;
}

interface NavigationOptions {
    pushHistory?: boolean;
    briefingStep?: number;
}

const clientRoutes = new Set<ClientRoute>(["base", "home", "stages-approvals", "financial", "briefing"]);

export class ClientSystemRouter {
    private listening = false;

    constructor(private readonly render: (route: ClientRoute, briefingStep?: number) => void) {}

    start(initialRoute: ClientRoute, restoreCurrentRoute = false): void {
        if (!this.listening) {
            window.addEventListener("popstate", this.handlePopState);
            this.listening = true;
        }
        const restored = restoreCurrentRoute ? this.restorableState(window.history.state, initialRoute) : undefined;
        if (initialRoute === "base") this.navigate("base", { pushHistory: false });
        const target = restored ?? (initialRoute === "base" ? { page: "home" as const } : { page: initialRoute });
        this.navigate(target.page, { pushHistory: false, briefingStep: target.briefingStep });
        window.history.replaceState({ scope: "client", page: target.page,
            ...(target.briefingStep === undefined ? {} : { briefingStep: target.briefingStep }) } satisfies ClientPageState, "");
    }

    navigate(route: ClientRoute, options: NavigationOptions = {}): void {
        this.render(route, options.briefingStep);

        if ((options.pushHistory ?? true) && this.shouldPush(route)) {
            window.history.pushState({ scope: "client", page: route,
                ...(options.briefingStep === undefined ? {} : { briefingStep: options.briefingStep }) } satisfies ClientPageState, "");
        }
    }

    private readonly handlePopState = (event: PopStateEvent): void => {
        const state = event.state as ClientPageState | null;
        if (!state || state.scope !== "client" || !clientRoutes.has(state.page)) return;

        this.navigate(state.page, {
            pushHistory: false,
            briefingStep: Number.isInteger(state.briefingStep) ? state.briefingStep : undefined
        });
    };

    private shouldPush(route: ClientRoute): boolean {
        const currentState = window.history.state as ClientPageState | null;
        return currentState?.page !== route;
    }

    private restorableState(value: unknown, initialRoute: ClientRoute): ClientPageState | undefined {
        const state = value as ClientPageState | null;
        if (!state || state.scope !== "client" || !clientRoutes.has(state.page) || state.page === "base") return undefined;
        if (initialRoute === "briefing" && state.page !== "briefing") return undefined;
        if (initialRoute === "base" && state.page === "briefing") return undefined;
        return state;
    }
}
