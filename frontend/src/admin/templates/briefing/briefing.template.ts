import html from 'nanohtml'
import u from 'umbrellajs';

interface roomItem {
    id: number;
    index: number;
}

export function roomItem(view: HTMLElement, id: number, index: number) {
    var viewString = view.outerHTML
        .split("%id%").join(id.toString())
        .split("%index%").join(index.toString())

    console.log(viewString)

    // var viewString =
    //     `${view}`
    //         .replace("%id%", id.toString())
    //         .replace("%index", index.toString())


    // console.log(view)            
    // var element = u(view)
    return u(viewString).first() as HTMLElement
}
