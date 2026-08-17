import { homeElements } from "@/admin/selectors/home.selector.ts.js";
import type { baseElements } from "./base.selector.js";

export interface ClientElementCollection {
    baseElements?: baseElements;
    homeElements?: homeElements
}
