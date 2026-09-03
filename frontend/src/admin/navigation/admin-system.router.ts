export type AdminRoute =
    | "base"
    | "home"
    | "clients"
    | "client-management"
    | "client-proposals"
    | "client-financial"
    | "new-client"
    | "briefing-home"
    | "briefing-investment"
    | "briefing-rooms"
    | "briefing-finish";

export interface AdminPageState {
    page: AdminRoute;
    id?: string;
}

interface NavigationOptions {
    pushHistory?: boolean;
    id?: string;
}

const adminRoutes = new Set<AdminRoute>([
    "base", "home", "clients", "client-management", "client-proposals", "client-financial", "new-client", "briefing-home",
    "briefing-investment", "briefing-rooms", "briefing-finish"
]);

export class AdminSystemRouter {
    private listening = false;

    constructor(private readonly render: (route: AdminRoute, id?: string) => void) {}

    start(): void {
        if (!this.listening) {
            window.addEventListener("popstate", this.handlePopState);
            this.listening = true;
        }
        this.navigate("base", { pushHistory: false });
        this.navigate("home");
    }

    navigate(route: AdminRoute, options: NavigationOptions = {}): void {
        this.render(route, options.id);
        if ((options.pushHistory ?? true) && this.shouldPush(route, options.id)) {
            window.history.pushState({ page: route, id: options.id } satisfies AdminPageState, "");
        }
    }

    private readonly handlePopState = (event: PopStateEvent): void => {
        const state = event.state as AdminPageState | null;
        if (!state || !adminRoutes.has(state.page)) return;
        this.navigate(state.page, { pushHistory: false, id: state.id });
    };

    private shouldPush(route: AdminRoute, id?: string): boolean {
        const state = window.history.state as AdminPageState | null;
        return state?.page !== route || state.id !== id;
    }
}
