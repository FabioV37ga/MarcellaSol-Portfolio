export type ClientRoute = "base" | "home" | "stages-approvals" | "financial" | "briefing";

export interface ClientPageState {
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

    start(initialRoute: ClientRoute): void {
        if (!this.listening) {
            window.addEventListener("popstate", this.handlePopState);
            this.listening = true;
        }
        if (initialRoute === "base") {
            this.navigate("base", { pushHistory: false });
            this.navigate("home");
            return;
        }
        this.navigate(initialRoute);
    }

    navigate(route: ClientRoute, options: NavigationOptions = {}): void {
        this.render(route, options.briefingStep);

        if ((options.pushHistory ?? true) && this.shouldPush(route)) {
            window.history.pushState({ page: route } satisfies ClientPageState, "");
        }
    }

    private readonly handlePopState = (event: PopStateEvent): void => {
        const state = event.state as ClientPageState | null;
        if (!state || !clientRoutes.has(state.page)) return;

        this.navigate(state.page, {
            pushHistory: false,
            briefingStep: Number.isInteger(state.briefingStep) ? state.briefingStep : undefined
        });
    };

    private shouldPush(route: ClientRoute): boolean {
        const currentState = window.history.state as ClientPageState | null;
        return currentState?.page !== route;
    }
}
