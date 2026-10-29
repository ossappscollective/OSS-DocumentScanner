export type RowPosition = 'first' | 'middle' | 'last' | 'only';

interface GroupableItem {
    doc?: unknown;
    folder?: unknown;
    position?: RowPosition;
}

const IOS_RADIUS = 18;
const ANDROID_OUTER_RADIUS = 20;
const ANDROID_INNER_RADIUS = 6;

export function getRowPosition(first: boolean, last: boolean): RowPosition {
    return first && last ? 'only' : first ? 'first' : last ? 'last' : 'middle';
}

function getGroup(item?: GroupableItem) {
    return item?.folder ? 'folder' : item?.doc ? 'doc' : undefined;
}

/**
 * gives each folder / document item its place in its run of same kind rows, returns the indexes that changed.
 * `from` and `to` limit the check to the rows around an insertion or a removal.
 */
export function updateRowPositions(getItem: (index: number) => GroupableItem | undefined, length: number, from = 0, to = length - 1) {
    const changed: number[] = [];
    for (let index = Math.max(0, from); index <= Math.min(length - 1, to); index++) {
        const item = getItem(index);
        const group = getGroup(item);
        if (!group) {
            continue;
        }
        const first = getGroup(getItem(index - 1)) !== group;
        const last = getGroup(getItem(index + 1)) !== group;
        const position = getRowPosition(first, last);
        if (item.position !== position) {
            item.position = position;
            changed.push(index);
        }
    }
    return changed;
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
