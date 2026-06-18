import u from "umbrellajs";
import { homePageElements, elements } from "../selectors/home.selector.js";
import HomePageView from "../views/homePage.view.js";

class HomePageController {

    elements: elements;
    view: HomePageView;

    constructor() {

        this.elements = homePageElements();

        this.view = new HomePageView(this.elements);

        this.addScrollEvent()
    }

    async addScrollEvent() {

        let yValue = 0;

        u("body").on("touchstart", (event: Event) => {
            const touchEvent = event as TouchEvent;

            yValue = touchEvent.touches[0].clientY;
        })

        u("body").on("touchend", (event: Event) => {
            const touchEvent = event as TouchEvent;

            const yValueFinal = touchEvent.changedTouches[0].clientY;
            const distance = yValue - yValueFinal;

            if (distance > 50) {
                this.view.scrollDownWelcome();
            }
        })

        u("body").on("wheel", (event: Event) => {
            const wheelEvent = event as WheelEvent;
            if (wheelEvent.deltaY > 0){
                this.view.scrollDownWelcome();
            }
        })
    }
}

export default HomePageController;