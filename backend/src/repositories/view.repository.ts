import views from "../models/view.js";

export class ViewRepository {
    findByPermission(permission: "admin" | "client") {
        return views.find({ permission });
    }

    findAdminBriefingViews() {
        return views.find({ permission: "admin", type: "briefing" });
    }
}
