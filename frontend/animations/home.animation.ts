// ---------------------------
// 1. IMPORTS E INTERFACE
// ---------------------------

import { animate, engine, cubicBezier } from "animejs"

import { Animation, AnimationObject } from "./animation.js";

engine.pauseOnDocumentHidden = true;

class HomeAnimations {
    static homeDelay: boolean = false;

    static fadeIn: AnimationObject = {
        isPlaying: false,
        animation: (element: HTMLElement, delay: number) => {
            HomeAnimations.fadeIn.isPlaying = true;
            element.style.display = 'flex'
            return animate(element, {
                opacity: [0, 1],
                translateY: ["-20px", "0px"],
                duration: 200,
                onComplete: () => {
                    HomeAnimations.fadeIn.isPlaying = false
                }
            })
        }
    }
}

export default HomeAnimations