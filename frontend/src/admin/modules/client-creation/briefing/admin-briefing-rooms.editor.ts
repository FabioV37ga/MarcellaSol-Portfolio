import type { briefingRooms } from "@/admin/selectors/newClient/briefing.selector.js";
import { getBriefingRoomOptions } from "@/admin/templates/briefing/briefing-room-options.template.js";
import { roomItem } from "@/admin/templates/briefing/briefing.template.js";
import type { BriefingDefinition } from "@/shared/briefing/briefing.types.js";
import u from "umbrellajs";

interface EditableRoom {
    id?: number;
    index?: number;
    name?: string;
    type?: string;
    subtype?: string;
    specs?: boolean[];
}

export class AdminBriefingRoomsEditor {
    private lastRoomId = 0;
    private lastRoomIndex = 0;
    private rooms?: briefingRooms;
    private addedRooms: EditableRoom[] = [];
    private draggedRoom?: HTMLElement;
    private template?: HTMLElement;

    constructor(private readonly briefing: BriefingDefinition) { }

    mount(elements: briefingRooms, template: HTMLElement): void {
        this.rooms = elements;
        this.template = template;
        this.restoreRoomsView();
    }

    addRoom(): void {
        if (!this.rooms || !this.template) return;
        this.addedRooms.push({ id: this.lastRoomId, index: this.lastRoomIndex });
        const model = roomItem(this.template, this.lastRoomId, this.lastRoomIndex);
        model.dataset.roomId = String(this.lastRoomId);
        model.dataset.roomIndex = String(this.lastRoomIndex);
        this.rooms.roomContainer.append(model);
        this.configureRoom(model);
        this.syncRoomFields(model);
        this.lastRoomId += 1;
        this.lastRoomIndex += 1;
    }

    private restoreRoomsView(): void {
        if (!this.rooms || !this.template) return;
        const snapshots = this.addedRooms.map(room => ({ ...room, specs: [...(room.specs ?? [])] }));
        this.rooms.roomContainer.replaceChildren();
        snapshots
            .sort((first, second) => (first.index ?? 0) - (second.index ?? 0))
            .forEach(snapshot => {
                const item = roomItem(this.template!, snapshot.id ?? 0, snapshot.index ?? 0);
                item.dataset.roomId = String(snapshot.id ?? 0);
                item.dataset.roomIndex = String(snapshot.index ?? 0);
                this.rooms!.roomContainer.append(item);
                this.configureRoom(item);
                const name = item.querySelector<HTMLElement>("[contenteditable]");
                const type = item.querySelector<HTMLSelectElement>(":scope > .briefing-room-select");
                if (name) name.textContent = snapshot.name ?? "";
                if (type) type.value = snapshot.type ?? "";
                this.appendRoomSpecs(item, snapshot.type ?? "");
                const subtype = item.querySelector<HTMLSelectElement>(".briefing-room-customizations select");
                if (subtype) subtype.value = snapshot.subtype ?? "";
                item.querySelectorAll<HTMLInputElement>(
                    '.briefing-room-customizations input[type="checkbox"]'
                ).forEach((field, index) => { field.checked = snapshot.specs[index] ?? false; });
                this.syncRoomFields(item);
            });
    }

    private configureRoom(item: HTMLElement): void {
        const roomSelect = u(item).children(".briefing-room-select").first() as HTMLSelectElement;
        const editableRoomName = item.querySelector<HTMLElement>("[contenteditable]");
        const deleteRoomButton = item.querySelector<HTMLButtonElement>(".briefing-room-delete");
        if (editableRoomName) {
            u(editableRoomName).off("click").on("click", (event: Event) => {
                event.preventDefault();
                event.stopPropagation();
            });
        }
        if (deleteRoomButton) {
            u(deleteRoomButton).off("click").on("click", (event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                this.deleteRoom(item);
            });
        }
        item.draggable = true;
        item.addEventListener("dragstart", (event: DragEvent) => {
            const target = event.target as HTMLElement;
            if (target.closest("select, option, input, button, [contenteditable]")) {
                event.preventDefault();
                return;
            }
            this.draggedRoom = item;
            item.classList.add("briefing-room-card-dragging");
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.dataset.roomId ?? "");
            }
        });
        item.addEventListener("dragover", (event: DragEvent) => {
            if (!this.draggedRoom || this.draggedRoom === item) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            const bounds = item.getBoundingClientRect();
            const before = event.clientY < bounds.top + bounds.height / 2;
            item.parentElement?.insertBefore(this.draggedRoom, before ? item : item.nextSibling);
        });
        item.addEventListener("drop", (event: DragEvent) => {
            event.preventDefault();
            this.syncRoomIndexes();
        });
        item.addEventListener("dragend", () => {
            this.draggedRoom?.classList.remove("briefing-room-card-dragging");
            this.draggedRoom = undefined;
            this.syncRoomIndexes();
        });
        item.addEventListener("input", () => this.syncRoomFields(item));
        item.addEventListener("change", () => this.syncRoomFields(item));
        u(roomSelect).on("change", () => this.appendRoomSpecs(item, roomSelect.value));
    }

    private deleteRoom(item: HTMLElement): void {
        const roomId = Number(item.dataset.roomId);
        this.addedRooms = this.addedRooms.filter(room => room.id !== roomId);
        if (this.draggedRoom === item) this.draggedRoom = undefined;
        item.remove();
        this.syncRoomIndexes();
        this.lastRoomIndex = this.addedRooms.length;
    }

    private syncRoomIndexes(): void {
        if (!this.rooms) return;
        const cards = Array.from(
            this.rooms.roomContainer.querySelectorAll<HTMLElement>(":scope > .briefing-room-card")
        );
        const roomsById = new Map(this.addedRooms.map(room => [room.id, room]));
        const reorderedRooms: EditableRoom[] = [];
        cards.forEach((card, index) => {
            const room = roomsById.get(Number(card.dataset.roomId));
            card.dataset.roomIndex = String(index);
            if (!room) return;
            room.index = index;
            reorderedRooms.push(room);
        });
        this.addedRooms = reorderedRooms;
        this.syncBriefingRooms();
    }

    private appendRoomSpecs(room: HTMLElement, roomType: string): void {
        u(room).children(".briefing-room-customizations").remove();
        const options = getBriefingRoomOptions(roomType);
        if (options) {
            room.insertAdjacentHTML("beforeend", options);
            u(room).addClass("briefing-room-card-customizable");
            this.syncRoomFields(room);
            return;
        }
        u(room).removeClass("briefing-room-card-customizable");
        this.syncRoomFields(room);
    }

    private syncRoomFields(item: HTMLElement): void {
        const room = this.addedRooms.find(candidate => candidate.id === Number(item.dataset.roomId));
        if (!room) return;
        room.name = item.querySelector<HTMLElement>("[contenteditable]")?.textContent?.trim() ?? "";
        room.type = item.querySelector<HTMLSelectElement>(":scope > .briefing-room-select")?.value ?? "";
        room.subtype = item.querySelector<HTMLSelectElement>(
            ".briefing-room-customizations select"
        )?.value || undefined;
        room.specs = Array.from(item.querySelectorAll<HTMLInputElement>(
            '.briefing-room-customizations input[type="checkbox"]'
        )).map(field => field.checked);
        this.syncBriefingRooms();
    }

    private syncBriefingRooms(): void {
        this.briefing.rooms = this.addedRooms.map(room => ({
            id: room.id ?? 0,
            index: room.index ?? 0,
            name: room.name ?? "",
            type: room.type ?? "",
            subtype: room.subtype,
            options: [...(room.specs ?? [])]
        }));
    }
}
