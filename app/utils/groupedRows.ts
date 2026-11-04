import { type RowPosition, updateRowPositions as updateSharedRowPositions } from '@shared/utils/groupedRows';

export type { RowPosition };

interface GroupableItem {
    doc?: unknown;
    folder?: unknown;
    position?: RowPosition;
}

const IOS_RADIUS = 18;
const ANDROID_OUTER_RADIUS = 20;
const ANDROID_INNER_RADIUS = 6;

function getGroup(item?: GroupableItem) {
    return item?.folder ? 'folder' : item?.doc ? 'doc' : undefined;
}

/**
 * gives each folder / document item its place in its run of same kind rows, returns the indexes that changed.
 * `from` and `to` limit the check to the rows around an insertion or a removal.
 */
export function updateRowPositions(getItem: (index: number) => GroupableItem | undefined, length: number, from = 0, to = length - 1) {
    return updateSharedRowPositions(getItem, length, getGroup, from, to);
}

/** iOS: one inset grouped container (outer corners only), Android: big outer corners and small inner ones */
export function getRowCorners(position: RowPosition = 'only', ios: boolean) {
    const top = position === 'first' || position === 'only';
    const bottom = position === 'last' || position === 'only';
    const outer = ios ? IOS_RADIUS : ANDROID_OUTER_RADIUS;
    const inner = ios ? 0 : ANDROID_INNER_RADIUS;
    return {
        borderTopLeftRadius: top ? outer : inner,
        borderTopRightRadius: top ? outer : inner,
        borderBottomLeftRadius: bottom ? outer : inner,
        borderBottomRightRadius: bottom ? outer : inner
    };
}
