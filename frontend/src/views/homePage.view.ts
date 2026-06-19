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

        // await Animation.animateAndWait(
        //     HomePageAnimations.hideBackground,
        //     document.documentElement,
        //     250
        // )
    }

    async scrollDownWelcome() {
        if (
            HomePageAnimations.appear.isPlaying == false &&
            HomePageAnimations.drawLogo.isPlaying == false &&
            HomePageAnimations.hideBackground.isPlaying == false &&
            HomePageAnimations.scrollUpWelcome.isPlaying == false &&
            this.welcomeStatus == "visible"
        ) {
            this.welcomeStatus = "animating";
            console.log("start scroll down")
            Animation.animateAndWait(
                HomePageAnimations.scrollDownWelcome,
                this.elements.homePageWelcome
            )
            this.welcomeStatus = "hidden"
        }
    }

    async scrollUpWelcome() {
        if (
            HomePageAnimations.appear.isPlaying == false &&
            HomePageAnimations.drawLogo.isPlaying == false &&
            HomePageAnimations.hideBackground.isPlaying == false &&
            HomePageAnimations.scrollDownWelcome.isPlaying == false &&
            this.welcomeStatus == "hidden"
        ) {
            this.welcomeStatus = "animating";
            console.log("start scroll up")
            Animation.animateAndWait(
                HomePageAnimations.scrollUpWelcome,
                this.elements.homePageWelcome
            )
            this.welcomeStatus = "visible"
        }
    }

}

export default HomePageView;