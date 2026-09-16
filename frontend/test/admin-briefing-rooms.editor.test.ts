import { describe, expect, it } from "vitest";
import { AdminBriefingRoomsEditor } from "../src/admin/modules/admin-briefing-rooms.editor.js";
import type { briefingRooms } from "../src/admin/selectors/newClient/briefing.selector.js";
import type { BriefingDefinition } from "../src/shared/briefing/briefing.types.js";

function template(): HTMLElement {
    const element = document.createElement("article");
    element.className = "briefing-room-card";
    element.innerHTML = `
        <span contenteditable="true">Cômodo</span>
        <select class="briefing-room-select">
            <option value=""></option><option value="quarto">Quarto</option><option value="cozinha">Cozinha</option>
        </select>
        <button class="briefing-room-delete" type="button">Excluir</button>
    `;
    return element;
}

function elements(): briefingRooms {
    return {
        root: [],
        cancel: document.createElement("button"),
        addRoom: document.createElement("button"),
        confirm: document.createElement("button"),
        roomContainer: document.createElement("div")
    };
}

describe("AdminBriefingRoomsEditor", () => {
    it("adiciona, personaliza, restaura e exclui um cômodo", () => {
        const briefing: BriefingDefinition = {};
        const editor = new AdminBriefingRoomsEditor(briefing);
        const firstView = elements();
        editor.mount(firstView, template());
        editor.addRoom();

        const card = firstView.roomContainer.querySelector<HTMLElement>(".briefing-room-card")!;
        card.querySelector<HTMLElement>("[contenteditable]")!.textContent = "Suíte principal";
        const type = card.querySelector<HTMLSelectElement>(":scope > .briefing-room-select")!;
        type.value = "quarto";
        type.dispatchEvent(new Event("change", { bubbles: true }));

        expect(card.classList.contains("briefing-room-card-customizable")).toBe(true);
        expect(briefing.rooms?.[0]).toMatchObject({ name: "Suíte principal", type: "quarto", index: 0 });

        const restoredView = elements();
        editor.mount(restoredView, template());
        expect(restoredView.roomContainer.querySelector<HTMLElement>("[contenteditable]")?.textContent)
            .toBe("Suíte principal");
        restoredView.roomContainer.querySelector<HTMLButtonElement>(".briefing-room-delete")!.click();
        expect(briefing.rooms).toEqual([]);
    });

    it("sincroniza a ordem visual dos cômodos", () => {
        const briefing: BriefingDefinition = {};
        const editor = new AdminBriefingRoomsEditor(briefing);
        const view = elements();
        editor.mount(view, template());
        editor.addRoom();
        editor.addRoom();
        const cards = Array.from(view.roomContainer.querySelectorAll<HTMLElement>(".briefing-room-card"));
        cards[0].querySelector<HTMLElement>("[contenteditable]")!.textContent = "Primeiro";
        cards[0].dispatchEvent(new Event("input", { bubbles: true }));
        cards[1].querySelector<HTMLElement>("[contenteditable]")!.textContent = "Segundo";
        cards[1].dispatchEvent(new Event("input", { bubbles: true }));

        view.roomContainer.append(cards[0]);
        cards[0].dispatchEvent(new Event("dragend"));
        expect(briefing.rooms?.map(room => room.name)).toEqual(["Segundo", "Primeiro"]);
        expect(briefing.rooms?.map(room => room.index)).toEqual([0, 1]);
    });
});
