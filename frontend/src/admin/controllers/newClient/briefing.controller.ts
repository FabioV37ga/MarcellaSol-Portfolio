import { briefingRooms, getBriefingHome, getBriefingInvestment, getBriefingRooms } from "@/admin/selectors/newClient/briefing.selector.js";
import { AdminBriefingDetailsEditor } from "@/admin/modules/admin-briefing-details.editor.js";
import { AdminBriefingInvestmentEditor } from "@/admin/modules/admin-briefing-investment.editor.js";
import { AdminBriefingRoomsEditor } from "@/admin/modules/admin-briefing-rooms.editor.js";
import getTemplates from "@/admin/templates/getter.js";
import { briefing } from "@/admin/templates/interface.js";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminViewsGateway } from "@/admin/infrastructure/views.api.js";
import type { AdminBriefingNavigator } from "@/admin/navigation/admin-briefing.navigator.js";
import type { BriefingDefinition } from "@/shared/briefing/briefing.types.js";

export type briefingObject = BriefingDefinition;

export class AdminBriefingController {
    private rooms!: briefingRooms
    private models!: briefing
    private readonly briefingObject: BriefingDefinition = {
        user: { name: "" },
        description: {
            category: "",
            type: "",
            name: "",
            adultAmount: 1,
            childrenAmount: 0
        },
        investmentFlexibility: false,
        rooms: []
    }
    private readonly detailsEditor = new AdminBriefingDetailsEditor(this.briefingObject)
    private readonly investmentEditor = new AdminBriefingInvestmentEditor(this.briefingObject)
    private readonly roomsEditor = new AdminBriefingRoomsEditor(this.briefingObject)


    constructor(
        private readonly views: Pick<AdminViewsGateway, "loadBriefingViews">,
        private readonly session: AdminSession,
        private readonly navigator: AdminBriefingNavigator
    ) { }

    async loadModels(name: string) {
        const views = await this.views.loadBriefingViews(this.session)

        this.briefingObject.user = { name }

        const templates = getTemplates("briefing", views, name)
        this.models = templates as briefing
        return templates
    }

    mount(page: string, onFinish?: () => void) {
        switch (page) {
            case "home":
                const home = getBriefingHome();
                this.navigator.bindHome(home, this.detailsEditor.mount(home))
                break
            case "investment":
                const investment = getBriefingInvestment()
                this.investmentEditor.mount(investment)
                this.navigator.bindInvestment(investment)
                break;
            case "rooms":
                this.rooms = getBriefingRooms();
                this.roomsEditor.mount(this.rooms, this.models.addedRoom!)
                this.navigator.bindRooms(this.rooms, () => this.roomsEditor.addRoom())
                break;

            case "finish":
                if (onFinish) this.navigator.bindFinish(onFinish)

                break;
        }
    }

    public getBriefingObject(): briefingObject {
        return this.briefingObject
    }

    setClientName(name: string): void {
        this.briefingObject.user = { name };
    }
}
