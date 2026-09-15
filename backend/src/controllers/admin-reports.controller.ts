import type { Request, Response } from "express";
import type { ClientBriefingReportService } from "../application/client-briefing-report.service.js";

export class AdminReportsController {
    constructor(private readonly briefingReports: Pick<ClientBriefingReportService, "status" | "generate">) { }

    briefingReportStatus = async (request: Request, response: Response): Promise<Response> => {
        const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        return response.status(200).json(await this.briefingReports.status(id));
    };

    generateBriefingReport = async (request: Request, response: Response): Promise<Response> => {
        const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        return response.status(201).json(await this.briefingReports.generate(id));
    };

}
