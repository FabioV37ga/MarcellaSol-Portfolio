import { describe, expect, it, vi } from "vitest";
import {
    BriefingAnswerCollector,
    briefingFileUploadId,
    isBriefingFieldLogicallyDisabled
} from "../src/client/ui/briefing/briefing-answer-collector.js";

function briefingPage(key: string, content: string): HTMLElement {
    const page = document.createElement("section");
    page.dataset.briefingPageKey = key;
    page.innerHTML = content;
    return page;
}

const project = {
    category: "residencial",
    type: "apartamento",
    name: "Projeto teste",
    adultAmount: 2,
    childrenAmount: 1
};

describe("BriefingAnswerCollector", () => {
    it("coleta campos escalares, grupos e arquivos sem controles de navegação", () => {
        const page = briefingPage("about", `
            <h2 class="briefing-title">Sobre o projeto</h2>
            <div class="briefing-input-box"><p>Quantidade</p><input name="amount" type="number" value="2"></div>
            <fieldset><legend>Estilo</legend><input name="style" type="radio" value="classic"><input name="style" type="radio" value="modern" checked></fieldset>
            <fieldset><legend>Itens</legend><input name="items" type="checkbox" value="table" checked><input name="items" type="checkbox" value="sofa"></fieldset>
            <div class="briefing-input-box"><label>Anexos<input name="plans" type="file"></label></div>
            <input name="hidden-answer" value="ignorada" disabled>
            <div class="briefing-navigation"><input name="navigation" value="ignorada"></div>
        `);
        const attachment = new File(["planta"], "planta.pdf", { type: "application/pdf" });
        const getFiles = vi.fn().mockReturnValue([attachment]);
        const result = new BriefingAnswerCollector({ getFiles }).collect(
            [page], project, new Date("2026-09-12T15:00:00.000Z")
        );

        expect(result.submittedAt).toBe("2026-09-12T15:00:00.000Z");
        expect(result.sections[0]).toMatchObject({
            key: "about",
            title: "Sobre o projeto",
            answers: [
                { key: "amount", question: "Quantidade", controlType: "number", value: 2 },
                { key: "style", question: "Estilo", controlType: "radio", value: "modern" },
                { key: "items", question: "Itens", controlType: "checkbox", value: ["table"] },
                {
                    key: "plans",
                    controlType: "file",
                    value: [{
                        name: "planta.pdf",
                        size: attachment.size,
                        type: "application/pdf",
                        uploadId: "global:about:plans:0"
                    }]
                }
            ]
        });
        expect(getFiles).toHaveBeenCalledOnce();
    });

    it("agrupa e ordena seções pertencentes aos ambientes", () => {
        const secondRoom = briefingPage("room-2", `<input name="note" value="Segundo">`);
        Object.assign(secondRoom.dataset, {
            briefingRoomId: "2", briefingRoomIndex: "1", briefingRoomName: "Quarto", briefingRoomType: "quarto"
        });
        const firstRoom = briefingPage("room-1", `<input name="note" value="Primeiro">`);
        Object.assign(firstRoom.dataset, {
            briefingRoomId: "1", briefingRoomIndex: "0", briefingRoomName: "Sala", briefingRoomType: "sala-estar"
        });

        const result = new BriefingAnswerCollector({ getFiles: () => [] }).collect([secondRoom, firstRoom], project);

        expect(result.sections).toEqual([]);
        expect(result.rooms.map(room => room.name)).toEqual(["Sala", "Quarto"]);
        expect(result.rooms[0].sections[0].answers[0].value).toBe("Primeiro");
    });

    it("preserva o estado lógico anterior de campos ocultados", () => {
        const field = document.createElement("input");
        field.disabled = true;
        field.dataset.briefingDisabledBeforeHide = "false";

        expect(isBriefingFieldLogicallyDisabled(field)).toBe(false);
        expect(briefingFileUploadId(briefingPage("files", ""), "plans", 2))
            .toBe("global:files:plans:2");
    });
});
