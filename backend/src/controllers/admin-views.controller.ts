import type { Request, Response } from "express";
import type { ViewRepository } from "../repositories/view.repository.js";

export class AdminViewsController {
    constructor(private readonly views: Pick<ViewRepository, "findByPermission" | "findAdminBriefingViews">) { }

    view = async (_request: Request, response: Response): Promise<Response> => {
        return response.status(200).json({ view: await this.views.findByPermission("admin") });
    };

    briefing = async (_request: Request, response: Response): Promise<Response> => {
        return response.status(200).json({ views: await this.views.findAdminBriefingViews() });
    };
}
