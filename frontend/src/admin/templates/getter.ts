import u from "umbrellajs";
import { system, dbView, briefing } from "./interface.js";

export default function getTemplates(templateType: string, elements: dbView[], name: string) {

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

    var views!: system | briefing;
    switch (templateType){
        case "system":
            views = {
                base: convertedElements[0],
                home: convertedElements[1],
                client: convertedElements[2],
                newClient: convertedElements[3],
                clientManagement: convertedElements[
                    elements.findIndex(element => element.viewName?.trim().toLowerCase() === "client-management")
                ],
                clientProposals: convertedElements[
                    elements.findIndex(element => element.viewName?.trim().toLowerCase() === "client-proposals")
                ]
                // home2: convertedElements[2],
                // test: convertedElements[2]
            }
            break;
        case "briefing":{
            views = {
                home: convertedElements[0],
                rooms: convertedElements[1],
                addedRoom: convertedElements[2],
                investment: convertedElements[3]
            }
        }
    }

    return views;
}
