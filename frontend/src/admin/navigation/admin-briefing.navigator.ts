import u from "umbrellajs";
import type {
    briefingHome,
    briefingInvestment,
    briefingRooms
} from "../selectors/newClient/briefing.selector.js";
import type { AdminRoute } from "./admin-system.router.js";

export class AdminBriefingNavigator {
    constructor(private readonly navigate: (route: AdminRoute) => void) { }

    bindHome(elements: briefingHome, canContinue: () => boolean): void {
        this.bindRoots(elements.root, ["clients", "new-client"]);
        u(elements.cancel).off("click").on("click", () => this.navigate("new-client"));
        u(elements.confirm).off("click").on("click", () => {
            if (canContinue()) this.navigate("briefing-investment");
        });
    }

    bindInvestment(elements: briefingInvestment): void {
        this.bindRoots(elements.root, ["clients", "new-client", "briefing-home"]);
        u(elements.cancel).off("click").on("click", () => this.navigate("briefing-home"));
        u(elements.confirm).off("click").on("click", () => this.navigate("briefing-rooms"));
    }

    bindRooms(elements: briefingRooms, addRoom: () => void): void {
        this.bindRoots(elements.root, ["clients", "new-client", "briefing-home"]);
        u(elements.cancel).off("click").on("click", () => this.navigate("briefing-investment"));
        u(elements.addRoom).off("click").on("click", addRoom);
        if (elements.confirm) {
            u(elements.confirm).off("click").on("click", () => this.navigate("briefing-finish"));
        }
    }

    bindFinish(confirm: () => void): void {
        const backButton = u("#briefing-finish-back").first() as HTMLElement | undefined;
        const finishButton = u("#briefing-finish-confirm").first() as HTMLElement | undefined;
        if (backButton) u(backButton).off("click").on("click", () => this.navigate("briefing-rooms"));
        if (finishButton) u(finishButton).off("click").on("click", confirm);
    }

    private bindRoots(elements: HTMLElement[], routes: AdminRoute[]): void {
        elements.forEach((element, index) => {
            const route = routes[index];
            if (route) u(element).off("click").on("click", () => this.navigate(route));
        });
    }
}
