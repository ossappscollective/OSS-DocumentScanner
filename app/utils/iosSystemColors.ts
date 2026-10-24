import { Color } from '@nativescript/core';

function resolve(color: UIColor, style: UIUserInterfaceStyle) {
    return Color.fromIosColor(color.resolvedColorWithTraitCollection(UITraitCollection.traitCollectionWithUserInterfaceStyle(style))).hex;
}

/** iOS: the surfaces and the texts of the theme are the system colors (light / dark only, no custom palette) */
export function withSystemColors<T extends { light: Record<string, string>; dark: Record<string, string> }>(theme: T): T {
    const pick = (style: UIUserInterfaceStyle) => ({
        colorBackground: resolve(UIColor.systemGroupedBackgroundColor, style),
        colorSurface: resolve(UIColor.secondarySystemGroupedBackgroundColor, style),
        colorSurfaceContainerLowest: resolve(UIColor.systemGroupedBackgroundColor, style),
        colorSurfaceContainerLow: resolve(UIColor.secondarySystemGroupedBackgroundColor, style),
        colorSurfaceContainer: resolve(UIColor.secondarySystemGroupedBackgroundColor, style),
        colorSurfaceContainerHigh: resolve(UIColor.secondarySystemGroupedBackgroundColor, style),
        colorSurfaceContainerHighest: resolve(UIColor.tertiarySystemGroupedBackgroundColor, style),
        colorOnBackground: resolve(UIColor.labelColor, style),
        colorOnSurface: resolve(UIColor.labelColor, style),
        colorOnSurfaceVariant: resolve(UIColor.secondaryLabelColor, style),
        colorOutline: resolve(UIColor.tertiaryLabelColor, style),
        colorOutlineVariant: resolve(UIColor.separatorColor, style)
    });
    return {
        ...theme,
        light: { ...theme.light, ...pick(UIUserInterfaceStyle.Light) },
        dark: { ...theme.dark, ...pick(UIUserInterfaceStyle.Dark) }
    };
}
