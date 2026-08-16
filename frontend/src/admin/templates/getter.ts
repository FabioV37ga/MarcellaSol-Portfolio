import u from "umbrellajs";
import { system, dbView } from "./interface.js";

export default function getTemplates(elements: dbView[], name: string) {

    var elementStringArray: string[] = []

    elements.forEach(string => {

        let elementString =
            string.view
                .replace("%username%", name)

        elementStringArray.push(
            elementString
        )
    })


    var convertedElements: HTMLElement[] = [];

    elementStringArray.forEach(string => {
        let element = u(string).first() as HTMLElement

        convertedElements.push(element)
    });


    const views: system = {
        base: convertedElements[0],
        home: convertedElements[1],
        client: convertedElements[2]
        // home2: convertedElements[2],
        // test: convertedElements[2]
    }

    return views;
}