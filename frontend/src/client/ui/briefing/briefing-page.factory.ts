import type { BriefingRoom, ResolvedBriefingDefinition } from "@/shared/briefing/briefing.types.js";
import { about_1, about_2 } from "../../templates/briefing/about.template.js";
import { ambient } from "../../templates/briefing/ambient.template.js";
import { balcony } from "../../templates/briefing/balcony.template.js";
import { bathroom } from "../../templates/briefing/bathroom.template.js";
import { bedroom } from "../../templates/briefing/bedroom.template.js";
import { diningRoom } from "../../templates/briefing/diningRoom.template.js";
import { ending } from "../../templates/briefing/ending.template.js";
import { existing } from "../../templates/briefing/existing.template.js";
import { home } from "../../templates/briefing/home.template.js";
import { investment } from "../../templates/briefing/investment.template.js";
import { kitchen } from "../../templates/briefing/kitchen.template.js";
import { laundry } from "../../templates/briefing/laundry.template.js";
import { livingRoom } from "../../templates/briefing/livingRoom.template.js";
import { preferences_1, preferences_2, preferences_3 } from "../../templates/briefing/preferences.template.js";
import { routine } from "../../templates/briefing/routine.template.js";
import { toilet } from "../../templates/briefing/toilet.template.js";

const roomLabels: Record<string, string> = {
    "sala-estar": "Sala de estar",
    "sala-jantar": "Sala de jantar",
    cozinha: "Cozinha",
    varanda: "Varanda",
    lavanderia: "Área de serviço",
    quarto: "Quarto",
    banheiro: "Banheiro",
    lavabo: "Lavabo"
};

function roomPage(room: BriefingRoom, residents: number): HTMLElement | undefined {
    const option = (index: number, fallback = true) => room.options[index] ?? fallback;

    switch (room.type) {
        case "sala-estar": return livingRoom();
        case "sala-jantar": return diningRoom();
        case "cozinha": return kitchen(residents, option(0));
        case "varanda": return balcony(option(0));
        case "lavanderia": return laundry();
        case "quarto": return bedroom(
            option(0), option(1), room.options.slice(2, 10).some(value => value) || room.options.length < 3,
            option(2), option(3), option(4), option(5), option(6), option(7), option(8), option(9),
            option(10), option(11), option(12), option(13)
        );
        case "banheiro": return bathroom();
        case "lavabo": return toilet();
        default: return undefined;
    }
}

function considerationPage(roomType: string): HTMLElement | undefined {
    switch (roomType) {
        case "cozinha": return existing.existingKitchen();
        case "lavanderia": return existing.existingLaundry();
        case "sala-estar": return existing.existingLivingRoom();
        case "varanda": return existing.existingGourmetBalcony();
        case "quarto": return existing.existingDormitories();
        default: return undefined;
    }
}

export class BriefingPageFactory {
    create(briefing: ResolvedBriefingDefinition): HTMLElement[] {
        const rooms = briefing.rooms;
        const { adultAmount, childrenAmount } = briefing.description;
        const residents = adultAmount + childrenAmount;
        const fixedPages = [
            ["welcome", home()],
            ["about-property", about_1(adultAmount, childrenAmount, true)],
            ["about-residents", about_2()],
            ["routine", routine()],
            ["investment", investment(briefing.investmentFlexibility)],
            ["preferences-atmosphere", preferences_1()],
            ["preferences-colors", preferences_2()],
            ["preferences-materials", preferences_3()],
            ["environments-overview", ambient(
                rooms.map(room => room.name || roomLabels[room.type] || room.type),
                residents
            )]
        ] as Array<[string, HTMLElement]>;
        const configuredRoomPages = rooms.reduce<HTMLElement[]>(
            (pages, room) => pages.concat(this.createRoomPages(room, residents)),
            []
        );

        return [
            ...fixedPages.map(([key, page]) => this.identify(page, key)),
            ...configuredRoomPages,
            this.identify(existing.existingFurniture(), "existing-furniture"),
            this.identify(ending(briefing.description.type, adultAmount, childrenAmount), "ending")
        ];
    }

    private createRoomPages(room: BriefingRoom, residents: number): HTMLElement[] {
        const pages: HTMLElement[] = [];
        const environment = roomPage(room, residents);
        const considerations = considerationPage(room.type);

        if (environment) pages.push(this.identify(environment, `room-${room.id}`, room, "environment"));
        if (considerations) {
            pages.push(this.identify(
                considerations,
                `room-${room.id}-considerations`,
                room,
                "considerations"
            ));
        }
        return pages;
    }

    private identify(
        page: HTMLElement,
        key: string,
        room?: BriefingRoom,
        kind?: "environment" | "considerations"
    ): HTMLElement {
        let pageElement = page;

        if (!(page instanceof HTMLElement)) {
            const fragment = page as unknown as DocumentFragment;
            const elementChildren = Array.from(fragment.children ?? []);

            if (elementChildren.length === 1) {
                pageElement = elementChildren[0] as HTMLElement;
            } else {
                pageElement = document.createElement("div");
                pageElement.className = "briefing-generated-page";
                pageElement.append(fragment);
            }
            console.warn(`Briefing: o template "${key}" retornou múltiplas raízes e foi normalizado.`);
        }

        pageElement.dataset.briefingPageKey = key;
        if (!room) return pageElement;

        pageElement.dataset.briefingRoomId = String(room.id);
        pageElement.dataset.briefingRoomIndex = String(room.index);
        pageElement.dataset.briefingRoomName = room.name;
        pageElement.dataset.briefingRoomType = room.type;
        pageElement.dataset.briefingRoomSubtype = room.subtype ?? "";
        pageElement.dataset.briefingRoomPageKind = kind ?? "environment";

        if (room.name) {
            const title = pageElement.querySelector<HTMLElement>(".briefing-title");
            if (title) title.textContent = room.name;
        }
        return pageElement;
    }
}
