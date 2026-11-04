import { getChipWash } from '~/utils/cardColors';
import { getRowCorners } from '~/utils/groupedRows';
import type { RowPosition } from '~/utils/groupedRows';

interface SettingsRowColors {
    colorSurfaceContainerLow: string;
    colorOutlineVariant: string;
    colorPrimary: string;
    colorPrimaryContainer: string;
    colorOnPrimaryContainer: string;
}

interface SettingsRowItem {
    id?: string;
    icon?: string;
    description?: unknown;
    position?: RowPosition;
}

const IOS_ICON_SIZE = 30;
const ANDROID_ICON_SIZE = 40;
const ROW_MARGIN = 16;
const IOS_ICON_WASH = 41; // 16%

/** props of a settings row drawn as a card of its group: iOS inset grouped, Android segmented */
export function getSettingsRowProps(item: SettingsRowItem, colors: SettingsRowColors, ios: boolean) {
    const last = item.position === 'last' || item.position === 'only';
    const supportingText = !!item.description;
    return {
        backgroundColor: colors.colorSurfaceContainerLow,
        marginLeft: ROW_MARGIN,
        marginRight: ROW_MARGIN,
        marginBottom: ios || last ? 0 : 2,
        ...getRowCorners(item.position, ios),
        fontSize: ios ? 17 : 16,
        subtitleFontSize: ios ? 13 : 14,
        lineHeightFactor: 1.3,
        // 52 on iOS, 64 on Android (72 with supporting text)
        verticalPadding: ios ? 15 : supportingText ? 17 : 21.5,
        showBottomLine: ios && !last,
        lineInset: item.icon ? ROW_MARGIN + IOS_ICON_SIZE + 12 : ROW_MARGIN,
        chevron: ios && item.id === 'sub_settings' ? 'mdi-chevron-right' : undefined
    };
}

/** props of the icon of a settings row: a circle in the accent */
export function getSettingsIconProps(colors: SettingsRowColors, ios: boolean) {
    const size = ios ? IOS_ICON_SIZE : ANDROID_ICON_SIZE;
    return {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: ios ? getChipWash(colors.colorPrimary, IOS_ICON_WASH) : colors.colorPrimaryContainer,
        color: ios ? colors.colorPrimary : colors.colorOnPrimaryContainer,
        fontSize: ios ? 17 : 24,
        padding: 0,
        marginRight: 12,
        textAlignment: 'center' as const,
        verticalTextAlignment: 'center' as const
    };
}
