import { Animation, AnimationObject } from "./animation.js";

import { animate, engine, cubicBezier } from "animejs"

engine.pauseOnDocumentHidden = true;




const drawLogo: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        drawLogo.isPlaying = true;
        return animate(element, {
            keyframes: {
                '0%': {
                    'stroke-dashoffset': -10000,
                    'fill': 'rgba(0,0,0,0)'
                },
                '70%': {
                    'stroke-dashoffset': 0,
                    'fill': 'rgba(0,0,0,0)'
                },
                '100%': {
                    'stroke-dashoffset': 0,
                    'fill': 'rgba(255,255,255,1)'
                }
            },
            duration: 3000,
            delay: delay,
            easing: cubicBezier(0.0001, .001, .01, .3),
            onComplete: () => {
                // element.style.display = 'none';
                drawLogo.isPlaying = false;
            }
        })
    }
}



const appear: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        appear.isPlaying = true;
        return animate(element, {
            opacity: [0, 1],
            duration: 1000,
            delay: delay,
            onComplete: () => {
                // element.style.display = 'none';
                appear.isPlaying = false;
            }
        })
    }
}

const hideBackground: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        hideBackground.isPlaying = true;
        return animate(element, {
            '--background-opacity': [1, 0],
            duration: 1200,
            easing: cubicBezier(0.4, 0, 0.2, 1),
            delay: delay,
            onComplete: () => {
                // element.style.display = 'none';
                hideBackground.isPlaying = false;
            }
        })
    }
}

const scrollDownWelcome: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        scrollDownWelcome.isPlaying = true;
        return animate(element, {
            width: ["100%", "0%"],
            height: ["100%", "0%"],
            // zoom: ["100%", "75%"],
            translateY: ["0px", "-270px"],
            duration: 1300,
            ease: "outExpo",
            onComplete: () => {
                element.style.display = 'none';
                scrollDownWelcome.isPlaying = false;
            }
        })
    }
}


export const HomePageAnimations = { drawLogo, appear, hideBackground, scrollDownWelcome }

