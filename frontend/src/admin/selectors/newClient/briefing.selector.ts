import u from "umbrellajs";

interface briefingHome{
    root: HTMLElement[],
    cancel: HTMLElement,
    confirm: HTMLElement,
    category: HTMLSelectElement;
    type: HTMLSelectElement
    name: HTMLInputElement,
    peopleAmount: HTMLInputElement
}

function getBriefingHome(): briefingHome{
    const root = u(".root-index").nodes as HTMLElement[]
    const cancel = u("#generate-briefing-cancel").first() as HTMLElement
    const confirm = u("#generate-briefing-confirm").first() as HTMLElement
    const inputs = u(".generate-briefing-form-input").nodes as (
        HTMLInputElement | HTMLSelectElement
    )[]

    return {
        root,
        cancel,
        confirm,
        category: inputs[0] as HTMLSelectElement,
        type: inputs[1] as HTMLSelectElement,
        name: inputs[2] as HTMLInputElement,
        peopleAmount: inputs[3] as HTMLInputElement
    }
}

interface briefingInvestment{
    root: HTMLElement[],
    cancel: HTMLElement,
    confirm: HTMLElement,
    flexibility: HTMLInputElement
}

function getBriefingInvestment():briefingInvestment{
    return{
        root: u(".root-index").nodes as HTMLElement[],
        cancel: u("#briefing-investment-cancel").first() as HTMLElement,
        confirm: u("#briefing-rooms-confirm").first() as HTMLElement,
        flexibility: u("#briefing-investment-flexibility").first() as HTMLInputElement
    }
}


interface briefingRooms{
    root: HTMLElement[]
    cancel: HTMLElement
    addRoom: HTMLElement
    roomContainer: HTMLElement;
    addedRooms?: HTMLElement[]
    confirm?:HTMLElement
}

function getBriefingRooms():briefingRooms{
    const root = u(".root-index").nodes as HTMLElement[]
    const cancel = u("#briefing-rooms-cancel").first() as HTMLElement
    const addRoom = u(".briefing-room-add").first() as HTMLElement
    const roomContainer = u(".briefing-rooms-list").first() as HTMLElement
    const confirm = u("#briefing-rooms-confirm").first() as HTMLElement


    return {
        root,
        cancel,
        addRoom,
        roomContainer,
        confirm
    }
}

export {
    getBriefingHome, briefingHome,
    getBriefingInvestment, briefingInvestment,
    getBriefingRooms, briefingRooms
}
