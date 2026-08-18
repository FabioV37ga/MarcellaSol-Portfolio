import { briefingHome, briefingInvestment, briefingRooms, getBriefingHome, getBriefingInvestment, getBriefingRooms } from "@/admin/selectors/newClient/briefing.selector.js";
import { getBriefingRoomOptions } from "@/admin/templates/briefing/briefing-room-options.template.js";
import { roomItem } from "@/admin/templates/briefing/briefing.template.js";
import getTemplates from "@/admin/templates/getter.js";
import { briefing } from "@/admin/templates/interface.js";
import { DbView } from "@/client/templates/interface.js";
import { config } from "@/utils/connection.js";
import u from "umbrellajs";

export interface briefingObject {
    id?: string;
    user: {
        name: string
    };
    description: {
        type: string;
        name: string;
    };
    residentAmount: number;
    rooms: room[]

}

interface room {
    id: number;
    index: number;
    name: string;
    options?: boolean[]
}

export class Briefing {
    private lastRoomId = 0;
    private lastRoomIndex = 0;
    private home!: briefingHome
    private investment!: briefingInvestment
    private rooms!: briefingRooms
    private addedRooms?: roomItem[] = []
    private models!: briefing


    constructor() {
        // this.getModels("","")
    }

    async getModels(login: string, password: string, name: string, adminLogin: string, adminPassword: string) {
        console.log(login, password)
        const response = await fetch(`${config.apiBaseUrl}/view/admin/briefing`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                login: adminLogin,
                password: adminPassword
            })
        })

        var data = await response.json()

        const templates = getTemplates("briefing", data.views, name)
        this.models = templates as briefing
        return templates
    }

    addUserInteractions(page: string, callback: any) {
        switch (page) {
            case "home":
                this.home = getBriefingHome();

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
                console.log("we are here - briefingcontroller")
                console.log(this.investment.confirm)
                u(this.investment.confirm)
                    .off("click")
                    .on("click", ()=>{
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

        this.appendRoomItem(roomObj as HTMLElement)

        this.lastRoomId += 1
        this.lastRoomIndex += 1

    }

    appendRoomItem(model: HTMLElement) {
        var container = u(".briefing-rooms-list").first() as HTMLElement

        container.append(model)
        this.configRoomItem(u(".briefing-room-card").last() as HTMLElement)
    }

    configRoomItem(item: HTMLElement) {
        const roomSelect = u(item)
            .children(".briefing-room-select")
            .first() as HTMLSelectElement

        u(roomSelect).on("change", () => {
            this.appendRoomSpecs(item, roomSelect.value)
        })
    }

    appendRoomSpecs(room: HTMLElement, roomType: string) {
        u(room).children(".briefing-room-customizations").remove()

        const roomOptions = getBriefingRoomOptions(roomType)

        if (roomOptions) {
            room.insertAdjacentHTML("beforeend", roomOptions)
            u(room).addClass("briefing-room-card-customizable")
            return
        }

        u(room).removeClass("briefing-room-card-customizable")
    }

}

interface roomItem {
    id?: number;
    index?: number;
    name?: string;
    type?: string;
    specs?: boolean[]

}
