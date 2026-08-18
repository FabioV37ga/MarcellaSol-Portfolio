import u from "umbrellajs";

interface briefingHome{
    root: HTMLElement[],
    cancel: HTMLElement,
    confirm: HTMLElement,
    category: HTMLInputElement;
    type: HTMLInputElement
    name: HTMLInputElement,
    peopleAmount: HTMLInputElement
}

function getBriefingHome(): briefingHome{
    const root = u(".root-index").nodes as HTMLElement[]
    const cancel = u("#generate-briefing-cancel").first() as HTMLElement
    const confirm = u("#generate-briefing-confirm").first() as HTMLElement
    const inputs = u(".generate-briefing-form-input").nodes as HTMLInputElement[]

    return {
        root,
        cancel,
        confirm,
        category: inputs[0],
        type: inputs[1],
        name: inputs[2],
        peopleAmount: inputs[3]
    }
}

interface briefingRooms{
    addRoom: HTMLElement
    roomContainer: HTMLElement;
    addedRooms?: HTMLElement[]
}

function getBriefingRooms():briefingRooms{
    const addRoom = u(".briefing-room-add").first() as HTMLElement
    const roomContainer = u(".briefing-rooms-list").first() as HTMLElement

    return {
        addRoom,
        roomContainer
    }
}

export {
    getBriefingHome, briefingHome,
    getBriefingRooms, briefingRooms
}