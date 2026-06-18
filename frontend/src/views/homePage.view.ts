import { elements, homePageElements } from "../selectors/home.selector.js";
import { Animation } from "../animations/animation.js";
import { HomePageAnimations } from "../animations/homePage.animations.js";

class HomePageView {

    elements: elements;
    welcomeStatus: "visible" | "animating" | "hidden" = "visible";

    constructor(elements: elements) {

        this.elements = elements;

        this.showLogo()
    }

    async showLogo() {

        Animation.animate(
            HomePageAnimations.drawLogo,
            this.elements.homePageLogo,
            300
        )

        await Animation.animateAndWait(
            HomePageAnimations.appear,
            this.elements.homePageTitle,
            3000
        )

        await Animation.animateAndWait(
            HomePageAnimations.hideBackground,
            document.documentElement,
            250
        )
    }

    async scrollDownWelcome() {
        if (
            HomePageAnimations.appear.isPlaying == false &&
            HomePageAnimations.drawLogo.isPlaying == false &&
            HomePageAnimations.hideBackground.isPlaying == false &&
            this.welcomeStatus == "visible"
        ) {
            this.welcomeStatus = "animating";
            Animation.animateAndWait(
                HomePageAnimations.scrollDownWelcome,
                this.elements.homePageWelcome
            )
            console.log("start scroll down")
        }
    }

}

export default HomePageView;