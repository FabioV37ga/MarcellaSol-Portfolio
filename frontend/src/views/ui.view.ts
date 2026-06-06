import u from "umbrellajs"

class ui {
    render(template: HTMLElement) {
        u(".content").append(template)
    }

    remove(target: HTMLElement) {
        target.remove()
    }
}

export default ui