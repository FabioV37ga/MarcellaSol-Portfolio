import u from "umbrellajs";
import { system, dbView } from "./interface.js";

export default function getTemplates(elements: dbView[]) {

    var elementStringArray: string[] = []

    elements.forEach(string => {
        elementStringArray.push(string.view)
    })


    var convertedElements: HTMLElement[] = [];

    elementStringArray.forEach(string => {
        let element = u(string).first() as HTMLElement

        convertedElements.push(element)
    });


    const views: system = {
        home: convertedElements[0],
        test: convertedElements[1]
    }

    return views;
}