import { Animation, AnimationObject } from "./animation.js";

import { animate, engine, cubicBezier } from "animejs"

engine.pauseOnDocumentHidden = true;


// ---------------------------
// Animações página inicial (0)

// Esconder:
const fadeOut: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        fadeOut.isPlaying = true;
        return animate(element, {
            opacity: [1, 0],
            duration: 250,
            delay: delay,
            easing: cubicBezier(0.4, 0, 0.2, 1),
            onComplete: () => {
                // element.style.display = 'none';
                fadeOut.isPlaying = false;
            }
        })
    }
}

// Escurecer background:
const darken: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        darken.isPlaying = true;
        return animate(element, {
            opacity: [0.8, 1],
            duration: 1000,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                darken.isPlaying = false;
            }
        })
    }
}


const brighten: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        brighten.isPlaying = true;
        return animate(element, {
            opacity: [0.8, 0],
            duration: 2500,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                brighten.isPlaying = false;
            }
        })
    }
}

// ---------------------------
// Animações página estratégias de conforto (4)

const showTitleSpan: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        showTitleSpan.isPlaying = true;
        return animate(element, {
            opacity: [0, 1],
            translateY: ['-5px', '0px'],
            duration: 600,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                showTitleSpan.isPlaying = false;
            }
        })
    }
}

const hideTitle: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        hideTitle.isPlaying = true;
        return animate(element, {
            opacity: [1, 0],
            duration: 600,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                hideTitle.isPlaying = false;
            }
        })
    }
}

const slideUp: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        slideUp.isPlaying = true;
        return animate(element, {
            display:  'flex',
            translateY: ['100%', '0%'],
            // marginBottom: ['-150px', '0px'],
            duration: 600,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                slideUp.isPlaying = false;
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
            duration: 600,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                appear.isPlaying = false;
            }
        })
    }
}

const hideVideo: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        hideVideo.isPlaying = true;
        return animate(element, {
            opacity: [0, 1],
            duration: 1000,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                hideVideo.isPlaying = false;
            }
        })
    }
}

const showThanks: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        showThanks.isPlaying = true;
        return animate(element, {
            display: 'block',
            opacity: [0, 1, 1, 0],
            duration: 2500,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                showThanks.isPlaying = false;
            }
        })
    }
}

const showFinalPicture: AnimationObject = {
    isPlaying: false,
    animation: (element: HTMLElement, delay: number) => {
        showFinalPicture.isPlaying = true;
        return animate(element, {
            display: 'block',
            opacity: [0, 1],
            duration: 1000,
            delay: delay,
            easing: 'linear',
            onComplete: () => {
                showFinalPicture.isPlaying = false;
            }
        })
    }
}


export const welcome = { fadeOut, darken, brighten }
export const strategies =  { showTitleSpan, hideTitle, slideUp, appear }
export const ending = { hideVideo, showThanks, showFinalPicture }