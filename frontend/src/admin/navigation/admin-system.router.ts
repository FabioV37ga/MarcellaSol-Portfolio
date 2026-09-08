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
    scope?: "admin";
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
const restorableAdminRoutes = new Set<AdminRoute>([
    "home", "clients", "client-management", "client-proposals", "client-financial"
]);
const adminRoutesRequiringClient = new Set<AdminRoute>(["client-management", "client-proposals", "client-financial"]);

export class AdminSystemRouter {
    private listening = false;

    constructor(private readonly render: (route: AdminRoute, id?: string) => void) {}

    start(restoreCurrentRoute = false): void {
        if (!this.listening) {
            window.addEventListener("popstate", this.handlePopState);
            this.listening = true;
        }
        const restored = restoreCurrentRoute ? this.restorableState(window.history.state) : undefined;
        this.navigate("base", { pushHistory: false });
        const target = restored ?? { page: "home" as const };
        this.navigate(target.page, { pushHistory: false, id: target.id });
        window.history.replaceState({ scope: "admin", page: target.page, id: target.id } satisfies AdminPageState, "");
    }

    navigate(route: AdminRoute, options: NavigationOptions = {}): void {
        this.render(route, options.id);
        if ((options.pushHistory ?? true) && this.shouldPush(route, options.id)) {
            window.history.pushState({ scope: "admin", page: route, id: options.id } satisfies AdminPageState, "");
        }
    }

    private readonly handlePopState = (event: PopStateEvent): void => {
        const state = event.state as AdminPageState | null;
        if (!state || state.scope !== "admin" || !adminRoutes.has(state.page)) return;
        this.navigate(state.page, { pushHistory: false, id: state.id });
    };

    private shouldPush(route: AdminRoute, id?: string): boolean {
        const state = window.history.state as AdminPageState | null;
        return state?.page !== route || state.id !== id;
    }

    private restorableState(value: unknown): AdminPageState | undefined {
        const state = value as AdminPageState | null;
        if (!state || state.scope !== "admin" || !restorableAdminRoutes.has(state.page)) return undefined;
        if (adminRoutesRequiringClient.has(state.page) && (typeof state.id !== "string" || !state.id)) return undefined;
        return state;
    }
}
