import { describe, expect, it } from "vitest";
import { normalizeBriefingData } from "../src/client/ui/briefing/briefing-data.mapper.js";
import { BriefingPageFactory } from "../src/client/ui/briefing/briefing-page.factory.js";

describe("BriefingPageFactory", () => {
    it("normaliza e ordena os ambientes antes de criar suas páginas", () => {
        const normalized = normalizeBriefingData({
            clientObject: { name: "  Cliente teste  " },
            briefingObject: {
                description: {
                    category: "residencial",
                    type: "apartamento",
                    name: "Projeto",
                    adultAmount: 2,
                    childrenAmount: 1
                },
                rooms: [
                    { id: 8, index: 1, name: "  Cozinha integrada  ", type: " COZINHA ", options: [] },
                    { id: 4, index: 0, name: "Sala principal", type: "sala-estar", options: [] }
                ]
            }
        }, "Nome alternativo");

        const pages = new BriefingPageFactory().create(normalized.briefingObject);
        const keys = pages.map(page => page.dataset.briefingPageKey);

        expect(normalized.clientObject.name).toBe("Cliente teste");
        expect(normalized.briefingObject.description).toMatchObject({ adultAmount: 2, childrenAmount: 1 });
        expect(normalized.briefingObject.rooms.map(room => room.id)).toEqual([4, 8]);
        expect(keys.slice(9, 13)).toEqual([
            "room-4",
            "room-4-considerations",
            "room-8",
            "room-8-considerations"
        ]);
        expect(pages.find(page => page.dataset.briefingPageKey === "room-8")?.dataset)
            .toMatchObject({
                briefingRoomId: "8",
                briefingRoomIndex: "1",
                briefingRoomName: "Cozinha integrada",
                briefingRoomType: "cozinha",
                briefingRoomPageKind: "environment"
            });
        expect(pages.find(page => page.dataset.briefingPageKey === "room-8")
            ?.querySelector(".briefing-title")?.textContent).toBe("Cozinha integrada");
        const about = pages.find(page => page.dataset.briefingPageKey === "about-property");
        expect(about?.querySelectorAll("[id^='adult-'][id$='-name']")).toHaveLength(2);
        expect(about?.querySelectorAll("[id^='adult-'][id$='-height']")).toHaveLength(2);
        expect(about?.querySelectorAll("[id^='adult-'][id$='-birth-date']")).toHaveLength(2);
        expect(about?.querySelectorAll("[id^='adult-'][id$='-phone']")).toHaveLength(2);
        expect(about?.querySelectorAll("[id^='adult-'][id$='-mail']")).toHaveLength(2);
        expect(about?.querySelectorAll("[id^='child-'][id$='-name']")).toHaveLength(1);
        expect(about?.querySelectorAll("[id^='child-'][id$='-height']")).toHaveLength(1);
        expect(about?.querySelectorAll("[id^='child-'][id$='-birth-date']")).toHaveLength(1);
        expect(about?.querySelectorAll("[id^='child-'][id$='-phone'], [id^='child-'][id$='-mail']"))
            .toHaveLength(0);
    });

    it("ignora tipos desconhecidos sem remover as páginas fixas", () => {
        const normalized = normalizeBriefingData({
            briefingObject: {
                rooms: [{ id: 1, index: 0, name: "Outro", type: "desconhecido", options: [] }]
            }
        }, "Cliente");
        const pages = new BriefingPageFactory().create(normalized.briefingObject);

        expect(pages).toHaveLength(11);
        expect(pages[0].dataset.briefingPageKey).toBe("welcome");
        expect(pages.at(-1)?.dataset.briefingPageKey).toBe("ending");
    });
});
