import { baseElements } from "./base.selector.js"
import type { homeElements } from "./home.selector.js";
import { clientsElements } from "./clients.selector.js"
import { newClientElements } from "./new-client.selector.js"

export default interface collection {
    baseElements?: baseElements,
    homeElements?: homeElements,
    clientsElements?: clientsElements,
    newClientElements?: newClientElements
}
