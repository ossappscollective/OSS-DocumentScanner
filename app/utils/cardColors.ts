import { Color } from '@nativescript/core';

export interface CardAccent {
    /** the card color, nudged until it holds 3:1 on the page */
    accent: string;
    /** the accent as a quiet wash over the page, for plates and capsules */
    container: string;
    /** the text color on the accent, 4.5:1 */
    onAccent: string;
    /** the text color on the accent for large text, 3:1: white as soon as it is readable */
    onAccentLarge: string;
    /** the text color over the gradient of the card color (the top of the iOS backdrop): the one iOS picks for its status bar, by the brightness of the blended color */
    onBackdrop: string;
}

function toColor(value: unknown) {
    return typeof value === 'string' && Color.isValid(value) ? new Color(value) : null;
}

function toHex(color: Color) {
    return color.hex.toLowerCase();
}

export function contrastRatio(first: Color, second: Color) {
    const [lighter, darker] = [first.getLuminance(), second.getLuminance()].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

/** `front` over `back` with the `amount` (0..1) of front */
function mix(front: Color, back: Color, amount: number) {
    return Color.mix(back, front, amount * 100);
}

function toLinear(channel: number) {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/** the chroma (CIELAB C*) of a color: how far from gray it is, close to the chroma of HCT */
export function getChroma(color: string | null | undefined) {
    const parsed = toColor(color);
    if (!parsed) {
        return 0;
    }
    const [red, green, blue] = [parsed.r, parsed.g, parsed.b].map(toLinear);
    const x = (0.4124 * red + 0.3576 * green + 0.1805 * blue) / 0.95047;
    const y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const z = (0.0193 * red + 0.1192 * green + 0.9505 * blue) / 1.08883;
    const f = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
    const a = 500 * (f(x) - f(y));
    const b = 200 * (f(y) - f(z));
    return Math.sqrt(a * a + b * b);
}

export const MIN_ACCENT_CHROMA = 16;

/**
 * The color of a card: the one set by the user, else the first colorful color extracted from its first photo (a white paper scan is too gray to carry an accent), else none
 */
export function pickCardColor(userColor: unknown, photoColors: (string | null | undefined)[]): string | null {
    if (toColor(userColor)) {
        return userColor as string;
    }
    return photoColors.find((color) => getChroma(color) >= MIN_ACCENT_CHROMA) ?? null;
}

/**
 * The colors of a card view derived from the card color: it keeps its hue and gets lighter on dark pages and darker on light ones until it is readable
 * `fallback` is used when the card has no color or an unreadable one.
 */
export function getCardAccent(color: string | null | undefined, dark: boolean, fallback: string): CardAccent {
    const page = new Color(dark ? '#000000' : '#ffffff');
    const towards = new Color(dark ? '#ffffff' : '#000000');
    let accent = toColor(color) ?? toColor(fallback) ?? new Color('#006a65');
    for (let step = 0; step < 20 && contrastRatio(accent, page) < 3; step++) {
        accent = mix(towards, accent, 0.1);
    }
    const white = new Color('#ffffff');
    const black = new Color('#000000');
    const onAccent = contrastRatio(white, accent) >= 4.5 ? white : black;
    const onAccentLarge = contrastRatio(white, accent) >= 3 ? white : black;
    // the text color iOS picks for its status bar: by the brightness of the blended color
    const onBackdrop = mix(accent, page, dark ? 0.7 : 0.85).isLight() ? '#000000' : '#ffffff';
    return { accent: toHex(accent), container: toHex(mix(accent, page, dark ? 0.28 : 0.14)), onAccent: toHex(onAccent), onAccentLarge: toHex(onAccentLarge), onBackdrop };
}

export interface TileColors {
    /** the fill of a tile with no photo */
    fill: string;
    /** the text color on the fill */
    text: string;
}

function toHsl(color: Color) {
    const red = color.r / 255;
    const green = color.g / 255;
    const blue = color.b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const lightness = (max + min) / 2;
    if (delta === 0) {
        return { hue: 0, saturation: 0, lightness };
    }
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue: number;
    if (max === red) {
        hue = ((green - blue) / delta + 6) % 6;
    } else if (max === green) {
        hue = (blue - red) / delta + 2;
    } else {
        hue = (red - green) / delta + 4;
    }
    return { hue: hue * 60, saturation, lightness };
}

function fromHsl(hue: number, saturation: number, lightness: number) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const channel = (offset: number) => {
        const position = (offset + hue / 30) % 12;
        return Math.round(255 * (lightness - (chroma / 2) * Math.max(-1, Math.min(position - 3, 9 - position, 1))));
    };
    return toHex(new Color(255, channel(0), channel(8), channel(4)));
}

function getReadableText(background: Color) {
    return contrastRatio(new Color('#ffffff'), background) >= contrastRatio(new Color('#000000'), background) ? '#ffffff' : '#000000';
}

/**
 * The look of a tile with no photo: the card color itself with the text color of best contrast (iOS), or a quiet tone of its hue (Android: light 84, dark 30, as the plate of the card view)
 */
export function getTileColors(color: string | null | undefined, dark: boolean, tonal: boolean, fallback: string): TileColors {
    const base = toColor(color) ?? toColor(fallback) ?? new Color('#006a65');
    if (!tonal) {
        return { fill: toHex(base), text: getReadableText(base) };
    }
    const { hue, saturation } = toHsl(base);
    return { fill: fromHsl(hue, Math.min(saturation, 0.55), dark ? 0.3 : 0.84), text: fromHsl(hue, Math.min(saturation, 0.4), dark ? 0.92 : 0.12) };
}
