import type { homeElements } from "@/admin/selectors/home.selector.js";
import type { baseElements } from "./base.selector.js";

export interface ClientElementCollection {
    baseElements?: baseElements;
    homeElements?: homeElements
}
