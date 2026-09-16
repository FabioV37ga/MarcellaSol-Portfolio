import type { BriefingDefinition, NewClientPayload } from "@/shared/briefing/briefing.types.js";
import { Briefing } from "./briefing.controller.js";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminViewsGateway } from "@/admin/infrastructure/views.api.js";
import type { AdminBriefingNavigator } from "@/admin/navigation/admin-briefing.navigator.js";

export type client = NewClientPayload;
export interface NewClientCredentials { name: string; login: string; password: string; }

export class newClient {
    private name: string;
    private login: string;
    private password: string;
    briefing?: BriefingDefinition;
    private briefingController!: Briefing

    constructor(
        name: string,
        login: string,
        password: string,
        views: Pick<AdminViewsGateway, "loadBriefingViews">,
        session: AdminSession,
        navigator: AdminBriefingNavigator
    ) {
        this.name = name;
        this.login = login;
        this.password = password
        this.briefingController = new Briefing(views, session, navigator)
    }

    async getModels() {
        return await this.briefingController.getModels(this.name)!
    }

    addUserInteractions(page: string, onFinish?: () => void) {
        this.briefingController.addUserInteractions(page, onFinish)
    }

    updateCredentials({ name, login, password }: NewClientCredentials): void {
        this.name = name;
        this.login = login;
        this.password = password;
        this.briefingController.getBriefingObject().user = { name };
    }

    getCredentials(): NewClientCredentials {
        return { name: this.name, login: this.login, password: this.password };
    }

    returnClientObject(): client {
        return {
            _id: '',
            login: this.login,
            password: this.password,
            name: this.name,
            hasFilledBriefing: false,
            briefing: this.briefingController.getBriefingObject()
        }
    }
}
