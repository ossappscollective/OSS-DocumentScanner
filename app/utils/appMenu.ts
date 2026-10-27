import type { MenuItem } from '@nativescript-community/ui-menu';
import { appIcon } from '~/utils/appIcons';

export interface AppMenuOption {
    id?: string;
    name?: string;
}

/** native menu items of options, with the app icon of each id and delete actions flagged destructive */
export function optionsToMenuItems<T extends AppMenuOption>(options: T[], onSelect?: (option: T) => void): MenuItem[] {
    return options.map((option) => ({
        id: option.id,
        title: option.name,
        icon: appIcon(option.id),
        destructive: option.id?.startsWith('delete'),
        ...(onSelect ? { onSelect: () => onSelect(option) } : {})
    }));
}
