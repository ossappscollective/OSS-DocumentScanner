export interface CardAccent {
    /** the card color, nudged until it holds 3:1 on the page */
    accent: string;
    /** the accent as a quiet wash over the page, for plates and capsules */
    container: string;
    /** the text color on the accent, 4.5:1 */
    onAccent: string;
}

type Rgb = [number, number, number];

function parseHex(color: string): Rgb | null {
    const match = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color?.trim() ?? '');
    if (!match) {
        return null;
    }
    const value = parseInt(match[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([red, green, blue]: Rgb) {
    return '#' + [red, green, blue].map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')).join('');
}

function luminance([red, green, blue]: Rgb) {
    const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

export function contrastRatio(first: Rgb, second: Rgb) {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

function mix(front: Rgb, back: Rgb, amount: number): Rgb {
    return [0, 1, 2].map((index) => front[index] * amount + back[index] * (1 - amount)) as Rgb;
}

/**
 * The colors of a card view derived from the card color: it keeps its hue and gets lighter on dark pages and darker on light ones until it is readable
 * `fallback` is used when the card has no color or an unreadable one.
 */
export function getCardAccent(color: string | null | undefined, dark: boolean, fallback: string): CardAccent {
    const page: Rgb = dark ? [0, 0, 0] : [255, 255, 255];
    const towards: Rgb = dark ? [255, 255, 255] : [0, 0, 0];
    let accent: Rgb = parseHex(color) ?? parseHex(fallback) ?? [0, 106, 101];
    for (let step = 0; step < 20 && contrastRatio(accent, page) < 3; step++) {
        accent = mix(towards, accent, 0.1);
    }
    const onAccent: Rgb = contrastRatio([255, 255, 255], accent) >= 4.5 ? [255, 255, 255] : [0, 0, 0];
    return { accent: toHex(accent), container: toHex(mix(accent, page, dark ? 0.28 : 0.14)), onAccent: toHex(onAccent) };
}
