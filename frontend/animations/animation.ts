/**
 * ============================================================================
 * ANIMATION
 * ============================================================================
 * 
 * SUMÁRIO:
 * 1. Classe Animation
 *    1.1. wait() - Aguarda um período de tempo usando requestAnimationFrame
 *    1.2. check() - Verifica condição dinamicamente até ser falsa
 * 
 * DESCRIÇÃO:
 * Classe utilitária para gerenciar delays e verificações de estado em animações,
 * utilizando requestAnimationFrame para precisão e performance otimizada.
 * 
 * ============================================================================
 */

import { JSAnimation } from "animejs"

// ---------------------------
// 2. INTERFACE ANIMATIONOBJECT
// ---------------------------
interface AnimationObject {
    isPlaying: boolean;
    animation: (...args: any[]) => JSAnimation | Promise<number> | void;
}


// ---------------------------
// 1. CLASSE ANIMATION
// ---------------------------

class Animation {

    // ---------------------------
    // 1.1. wait - Aguarda um período de tempo usando requestAnimationFrame
    // ---------------------------

    static wait(cooldown: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime: number = performance.now();

            const checkFrame = (currentTime: number): void => {
                const elapsed: number = currentTime - startTime;

                if (elapsed >= cooldown) {
                    resolve();
                } else {
                    requestAnimationFrame(checkFrame);
                }
            };

            requestAnimationFrame(checkFrame);
        });
    }

    // ---------------------------
    // 1.2. check - Verifica condição dinamicamente até ser falsa
    // ---------------------------

    static check(condition: () => boolean): Promise<void> {
        return new Promise((resolve) => {
            const checkFrame = (): void => {
                // Verifica a condição dinamicamente
                if (!condition()) {

                    resolve();
                } else {

                    requestAnimationFrame(checkFrame);
                }
            };

            requestAnimationFrame(checkFrame);
        });
    }

    static async animateAndWait(
        animationObject: AnimationObject,
        target?: HTMLElement,
        delay?: number
    ) {

        animationObject.animation(target, delay)

        await Animation.check(
            () => animationObject.isPlaying
        )

        return true
    }

    static animate(
        animationObject: AnimationObject,
        target?: HTMLElement,
        delay?: number
    ) {
        animationObject.animation(target, delay)
    }
}

export { Animation, AnimationObject };