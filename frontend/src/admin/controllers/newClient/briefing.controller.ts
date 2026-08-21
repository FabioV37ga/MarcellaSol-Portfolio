import { briefingHome, briefingInvestment, briefingRooms, getBriefingHome, getBriefingInvestment, getBriefingRooms } from "@/admin/selectors/newClient/briefing.selector.js";
import { getBriefingRoomOptions } from "@/admin/templates/briefing/briefing-room-options.template.js";
import { roomItem } from "@/admin/templates/briefing/briefing.template.js";
import getTemplates from "@/admin/templates/getter.js";
import { briefing } from "@/admin/templates/interface.js";
import { DbView } from "@/client/templates/interface.js";
import { config } from "@/utils/connection.js";
import type { BriefingDefinition } from "@/shared/briefing/briefing.types.js";
import u from "umbrellajs";

export type briefingObject = BriefingDefinition;

export class Briefing {
    private lastRoomId = 0;
    private lastRoomIndex = 0;
    private home!: briefingHome
    private investment!: briefingInvestment
    private rooms!: briefingRooms
    private addedRooms?: roomItem[] = []
    private models!: briefing
    private draggedRoom?: HTMLElement
    private readonly briefingObject: BriefingDefinition = {
        user: { name: "" },
        description: {
            category: "",
            type: "",
            name: "",
            residentAmount: 0
        },
        investmentFlexibility: false,
        rooms: []
    }


    constructor() {
        // this.getModels("","")
    }

    async getModels(name: string, sessionToken: string) {
        const response = await fetch(`${config.apiBaseUrl}/view/admin/briefing`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionToken}`
            },
            body: JSON.stringify({})
        })

        var data = await response.json()

        this.briefingObject.user = { name }

        const templates = getTemplates("briefing", data.views, name)
        this.models = templates as briefing
        return templates
    }

    addUserInteractions(page: string, callback: any) {
        switch (page) {
            case "home":
                this.home = getBriefingHome();

                const homeFields = [
                    this.home.category,
                    this.home.type,
                    this.home.name,
                    this.home.peopleAmount
                ]

                homeFields.forEach(field => {
                    u(field)
                        .off("input")
                        .on("input", () => this.syncHomeFields())
                        .off("change")
                        .on("change", () => this.syncHomeFields())
                })

                this.syncHomeFields()

                var clientsRoot = u(this.home.root).nodes[0] as HTMLElement
                u(clientsRoot)
                    .off("click")
                    .on("click", () => {
                        callback("clients")
                    })

                var newClientRoot = u(this.home.root).nodes[1] as HTMLElement
                u(newClientRoot)
                    .off("click")
                    .on("click", () => {
                        callback("new-client")
                    })

                u(this.home.confirm)
                    .off("click")
                    .on("click", () => {
                        this.checkFields(page) ? callback("briefing-investment") : null
                    })
                break
            case "investment":
                this.investment = getBriefingInvestment()

                u(this.investment.flexibility)
                    .off("change")
                    .on("change", () => this.syncInvestmentFields())

                this.syncInvestmentFields()

                u(this.investment.confirm)
                    .off("click")
                    .on("click", () => {
                        callback("briefing-rooms")
                    })
                break;
            case "rooms":
                this.rooms = getBriefingRooms();

                u(this.rooms.addRoom)
                    .off("click")
                    .on("click", () => {
                        callback("added-room")
                        // callback("investment")
                        this.createRoomItem()

                    })
                u(this.rooms.confirm!)
                    .off("click")
                    .on("click", () => {
                        // console.log(JSON.stringify(this.getBriefingObject()))
                        callback("briefing-finish")
                    })


                break;

            case "finish":
                var finishButton = u("#briefing-finish-confirm").first() as HTMLElement

                u(finishButton)
                    .off("click")
                    .on("click", () => [
                        callback(this.getBriefingObject())
                    ])

                break;
        }
    }

    protected checkFields(page: string): boolean {
        switch (page) {
            case "home":
                if (
                    this.home.category.value &&
                    this.home.type.value &&
                    this.home.name.value &&
                    this.home.peopleAmount.value
                ) {
                    return true
                } else {
                    return false
                }

        }
        return false
    }

    private syncHomeFields() {
        this.briefingObject.description = {
            category: this.home.category.value,
            type: this.home.type.value,
            name: this.home.name.value.trim(),
            residentAmount: Number(this.home.peopleAmount.value) || 0
        }
    }

    private syncInvestmentFields() {
        this.briefingObject.investmentFlexibility = this.investment.flexibility.checked
    }

    public getBriefingObject(): briefingObject {
        return this.briefingObject
    }

    createRoomItem() {
        this.addedRooms!.push(
            {
                id: this.lastRoomId,
                index: this.lastRoomIndex
            }
        )

        const roomObj = roomItem(
            this.models.addedRoom!,
            this.lastRoomId!,
            this.lastRoomIndex!
        )

        roomObj.dataset.roomId = this.lastRoomId.toString()
        roomObj.dataset.roomIndex = this.lastRoomIndex.toString()

        this.appendRoomItem(roomObj as HTMLElement)

        this.lastRoomId += 1
        this.lastRoomIndex += 1

    }

    appendRoomItem(model: HTMLElement) {
        var container = u(".briefing-rooms-list").first() as HTMLElement

        container.append(model)
        const addedRoom = u(".briefing-room-card").last() as HTMLElement

        this.configRoomItem(addedRoom)
        this.syncRoomFields(addedRoom)
    }

    configRoomItem(item: HTMLElement) {
        const roomSelect = u(item)
            .children(".briefing-room-select")
            .first() as HTMLSelectElement

        const editableRoomName = item.querySelector<HTMLElement>("[contenteditable]")
        const deleteRoomButton = item.querySelector<HTMLButtonElement>(".briefing-room-delete")

        if (editableRoomName) {
            u(editableRoomName)
                .off("click")
                .on("click", (event: Event) => {
                    event.preventDefault()
                    event.stopPropagation()
                })
        }

        if (deleteRoomButton) {
            u(deleteRoomButton)
                .off("click")
                .on("click", (event: Event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    this.deleteRoomItem(item)
                })
        }

        item.draggable = true

        item.addEventListener("dragstart", (event: DragEvent) => {
            const eventTarget = event.target as HTMLElement
            const isInteractiveElement = eventTarget.closest(
                "select, option, input, button, [contenteditable]"
            )

            if (isInteractiveElement) {
                event.preventDefault()
                return
            }

            this.draggedRoom = item
            item.classList.add("briefing-room-card-dragging")

            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", item.dataset.roomId ?? "")
            }
        })

        item.addEventListener("dragover", (event: DragEvent) => {
            if (!this.draggedRoom || this.draggedRoom === item) {
                return
            }

            event.preventDefault()

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move"
            }

            const itemBounds = item.getBoundingClientRect()
            const insertBeforeItem = event.clientY < itemBounds.top + itemBounds.height / 2
            const container = item.parentElement

            if (insertBeforeItem) {
                container?.insertBefore(this.draggedRoom, item)
            } else {
                container?.insertBefore(this.draggedRoom, item.nextSibling)
            }
        })

        item.addEventListener("drop", (event: DragEvent) => {
            event.preventDefault()
            this.syncRoomIndexes()
        })

        item.addEventListener("dragend", () => {
            this.draggedRoom?.classList.remove("briefing-room-card-dragging")
            this.draggedRoom = undefined
            this.syncRoomIndexes()
        })

        item.addEventListener("input", () => {
            this.syncRoomFields(item)
        })

        item.addEventListener("change", () => {
            this.syncRoomFields(item)
        })

        u(roomSelect).on("change", () => {
            this.appendRoomSpecs(item, roomSelect.value)
        })
    }

    private deleteRoomItem(item: HTMLElement) {
        const roomId = Number(item.dataset.roomId)

        this.addedRooms = this.addedRooms?.filter(room => room.id !== roomId) ?? []

        if (this.draggedRoom === item) {
            this.draggedRoom = undefined
        }

        item.remove()
        this.syncRoomIndexes()
        this.lastRoomIndex = this.addedRooms.length
    }

    private syncRoomIndexes() {
        const container = this.rooms?.roomContainer

        if (!container) {
            return
        }

        const cards = Array.from(
            container.querySelectorAll<HTMLElement>(":scope > .briefing-room-card")
        )
        const roomsById = new Map(
            this.addedRooms?.map(room => [room.id, room]) ?? []
        )

        const reorderedRooms: roomItem[] = []

        cards.forEach((card, index) => {
            const roomId = Number(card.dataset.roomId)
            const room = roomsById.get(roomId)

            card.dataset.roomIndex = index.toString()

            if (!room) {
                return
            }

            room.index = index
            reorderedRooms.push(room)
        })

        this.addedRooms = reorderedRooms
        this.syncBriefingRooms()
    }

    appendRoomSpecs(room: HTMLElement, roomType: string) {
        u(room).children(".briefing-room-customizations").remove()

        const roomOptions = getBriefingRoomOptions(roomType)

        if (roomOptions) {
            room.insertAdjacentHTML("beforeend", roomOptions)
            u(room).addClass("briefing-room-card-customizable")
            this.syncRoomFields(room)
            return
        }

        u(room).removeClass("briefing-room-card-customizable")
        this.syncRoomFields(room)
    }

    private syncRoomFields(item: HTMLElement) {
        const roomId = Number(item.dataset.roomId)
        const room = this.addedRooms?.find(addedRoom => addedRoom.id === roomId)

        if (!room) {
            return
        }

        const roomName = item.querySelector<HTMLElement>("[contenteditable]")
        const roomType = item.querySelector<HTMLSelectElement>(":scope > .briefing-room-select")
        const roomSubtype = item.querySelector<HTMLSelectElement>(
            ".briefing-room-customizations select"
        )
        const optionFields = Array.from(
            item.querySelectorAll<HTMLInputElement>(
                '.briefing-room-customizations input[type="checkbox"]'
            )
        )

        room.name = roomName?.textContent?.trim() ?? ""
        room.type = roomType?.value ?? ""
        room.subtype = roomSubtype?.value || undefined
        room.specs = optionFields.map(field => field.checked)

        this.syncBriefingRooms()
    }

    private syncBriefingRooms() {
        this.briefingObject.rooms = (this.addedRooms ?? []).map(room => ({
            id: room.id ?? 0,
            index: room.index ?? 0,
            name: room.name ?? "",
            type: room.type ?? "",
            subtype: room.subtype,
            options: [...(room.specs ?? [])]
        }))
    }

}

interface roomItem {
    id?: number;
    index?: number;
    name?: string;
    type?: string;
    subtype?: string;
    specs?: boolean[]

}
