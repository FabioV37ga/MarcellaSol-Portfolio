import { describe, expect, it, vi } from "vitest";
import { BriefingSubmissionFlow } from "../src/client/ui/briefing/briefing-submission.flow.js";

const project = {
    category: "residencial",
    type: "apartamento",
    name: "Projeto teste",
    adultAmount: 2,
    childrenAmount: 1
};

function pageWithFiles(): { page: HTMLElement; first: HTMLInputElement; ignored: HTMLInputElement } {
    const page = document.createElement("section");
    page.dataset.briefingPageKey = "about-property";
    page.innerHTML = `
        <input name="property-area" value="80">
        <input type="file" name="property-plans" multiple>
        <input type="file" name="ignored" disabled>
    `;
    return {
        page,
        first: page.querySelector<HTMLInputElement>("[name='property-plans']")!,
        ignored: page.querySelector<HTMLInputElement>("[name='ignored']")!
    };
}

describe("BriefingSubmissionFlow", () => {
    it("aguarda arquivos, monta anexos e limpa o rascunho somente após enviar", async () => {
        const { page, first, ignored } = pageWithFiles();
        const template = document.createElement("main");
        template.append(page);
        const files = [
            new File(["a"], "planta.pdf", { type: "application/pdf" }),
            new File(["b"], "referência.jpg", { type: "image/jpeg" })
        ];
        const order: string[] = [];
        const api = {
            submit: vi.fn(async () => { order.push("submit"); })
        };
        const drafts = {
            remove: vi.fn(() => { order.push("remove-draft"); })
        };
        const fileDrafts = {
            waitUntilReady: vi.fn(async () => { order.push("wait-files"); }),
            getFiles: vi.fn((_page, _index, field: HTMLInputElement) => field === first ? files : []),
            clear: vi.fn(async () => { order.push("clear-files"); })
        };
        const completedBriefing = { version: 1 } as never;
        const answers = { collect: vi.fn().mockReturnValue(completedBriefing) };
        const flow = new BriefingSubmissionFlow(api, drafts, fileDrafts, answers);

        await flow.submit({ token: "token", pages: [page], template, project });

        expect(order).toEqual(["wait-files", "submit", "remove-draft", "clear-files"]);
        expect(answers.collect).toHaveBeenCalledWith([page], project);
        expect(fileDrafts.getFiles).toHaveBeenCalledOnce();
        expect(fileDrafts.getFiles).not.toHaveBeenCalledWith(page, 2, ignored);
        expect(api.submit).toHaveBeenCalledWith({
            token: "token",
            briefing: completedBriefing,
            attachments: [
                {
                    file: files[0],
                    manifest: {
                        uploadId: "global:about-property:property-plans:0",
                        pageKey: "about-property",
                        answerKey: "property-plans",
                        fileIndex: 0,
                        originalName: "planta.pdf"
                    }
                },
                {
                    file: files[1],
                    manifest: {
                        uploadId: "global:about-property:property-plans:1",
                        pageKey: "about-property",
                        answerKey: "property-plans",
                        fileIndex: 1,
                        originalName: "referência.jpg"
                    }
                }
            ]
        });
    });

    it("preserva os rascunhos quando o envio falha", async () => {
        const { page } = pageWithFiles();
        const api = { submit: vi.fn().mockRejectedValue(new Error("falha")) };
        const drafts = { remove: vi.fn() };
        const fileDrafts = {
            waitUntilReady: vi.fn().mockResolvedValue(undefined),
            getFiles: vi.fn().mockReturnValue([]),
            clear: vi.fn()
        };
        const answers = { collect: vi.fn().mockReturnValue({}) };
        const flow = new BriefingSubmissionFlow(api, drafts, fileDrafts, answers);

        await expect(flow.submit({ token: "token", pages: [page], template: page, project }))
            .rejects.toThrow("falha");

        expect(drafts.remove).not.toHaveBeenCalled();
        expect(fileDrafts.clear).not.toHaveBeenCalled();
    });
});
