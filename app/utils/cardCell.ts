import dayjs from 'dayjs';
import type { Item } from '~/components/list/MainList.svelte';
import { documentHasPKPassData } from '~/utils/pkpass';
import { pickCardColor } from '~/utils/cardColors';
import { isEInk } from '~/helpers/theme';

export type CardVariant = '' | 'photo' | 'pkpass';

/** the template of a card: a template never changes structure, so each kind of card has its own */
export function getCardVariant(item?: Item): CardVariant {
    if (!item?.doc) {
        return '';
    }
    if (documentHasPKPassData(item.doc)) {
        return 'pkpass';
    }
    return item.doc.pages[0]?.imagePath ? 'photo' : '';
}

export function getCardDisplay(item: Item) {
    const { doc } = item;
    const page = doc.pages[0];
    // the default name is a timestamp: a tile only shows its date
    const autoName = !doc.name || /\d+:\d+:\d+/.test(doc.name);
    return {
        page,
        hasImage: !!page?.imagePath,
        hasCode: !!page?.qrcode?.length,
        autoName,
        label: autoName ? dayjs(doc.createdDate).format('ll') : doc.name,
        cardColor: isEInk ? null : pickCardColor(doc.extra?.color, [page?.extra?.color, ...(page?.colors ?? [])])
    };
}
