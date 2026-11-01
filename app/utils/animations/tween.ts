export type Easing = (progress: number) => number;

export interface Tween {
    value: number;
    from: number;
    to: number;
    start: number;
    duration: number;
    ease: Easing;
    onUpdate?: () => void;
    onEnd?: () => void;
}

export const linear: Easing = (progress) => progress;
export const easeInOut: Easing = (progress) => (progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2);

// cubic-bezier(0.2, 0.9, 0.3, 1.15), solved by bisection
export const easeSlide: Easing = (progress) => {
    const bezier = (time: number, first: number, second: number) => 3 * (1 - time) * (1 - time) * time * first + 3 * (1 - time) * time * time * second + time * time * time;
    let low = 0;
    let high = 1;
    for (let step = 0; step < 12; step++) {
        const middle = (low + high) / 2;
        if (bezier(middle, 0.2, 0.3) < progress) {
            low = middle;
        } else {
            high = middle;
        }
    }
    return bezier((low + high) / 2, 0.9, 1.15);
};

const runningTweens = new Set<Tween>();
let ticking = false;

function tick() {
    const now = Date.now();
    for (const tween of [...runningTweens]) {
        const progress = Math.min(1, (now - tween.start) / tween.duration);
        tween.value = tween.from + (tween.to - tween.from) * tween.ease(progress);
        if (progress === 1) {
            runningTweens.delete(tween);
        }
        tween.onUpdate?.();
        if (progress === 1) {
            tween.onEnd?.();
        }
    }
    if (runningTweens.size) {
        requestAnimationFrame(tick);
    } else {
        ticking = false;
    }
}

/** A number animated by hand, for what is drawn (a canvas) and has no view property to animate */
export function createTween(value = 0, onUpdate?: () => void, onEnd?: () => void): Tween {
    return { value, from: value, to: value, start: 0, duration: 0, ease: linear, onUpdate, onEnd };
}

/** a `duration` of 0 jumps to the value */
export function animateTween(tween: Tween, to: number, duration: number, ease: Easing = easeInOut) {
    tween.from = tween.value;
    tween.to = to;
    if (duration <= 0) {
        runningTweens.delete(tween);
        tween.value = to;
        tween.onUpdate?.();
        tween.onEnd?.();
        return;
    }
    tween.start = Date.now();
    tween.duration = duration;
    tween.ease = ease;
    runningTweens.add(tween);
    if (!ticking) {
        ticking = true;
        requestAnimationFrame(tick);
    }
}

export function stopTween(tween: Tween) {
    runningTweens.delete(tween);
}
