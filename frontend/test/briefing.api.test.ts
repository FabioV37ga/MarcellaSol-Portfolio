import { afterEach, describe, expect, it, vi } from "vitest";
import { BriefingApi } from "../src/client/infrastructure/briefing/briefing.api.js";

describe("BriefingApi", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("separa o nome original do nome ASCII usado no transporte multipart", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const file = new File(["conteúdo"], "Planta térrea versão final.PDF", { type: "application/pdf" });

        await new BriefingApi().submit({
            token: "session-token",
            briefing: { version: 1 },
            attachments: [{
                file,
                manifest: {
                    uploadId: "room-1:page:attachment:0",
                    pageKey: "page",
                    answerKey: "attachment",
                    fileIndex: 0,
                    originalName: file.name
                }
            }]
        });

        const request = fetchMock.mock.calls[0][1] as RequestInit;
        const formData = request.body as FormData;
        const transportedFile = formData.getAll("files")[0] as File;
        const payload = JSON.parse(String(formData.get("payload")));

        expect(transportedFile.name).toBe("briefing-attachment-0.pdf");
        expect(payload.fileManifest[0]).toMatchObject({
            originalName: "Planta térrea versão final.PDF",
            transportName: "briefing-attachment-0.pdf"
        });
    });
});
