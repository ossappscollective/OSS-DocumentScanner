interface FillablePage {
    imagePath?: string;
    pkpass_id?: string;
}
interface FillData {
    id?: string;
    image?: unknown;
    imagePath?: string;
}

/** a page created for a code only receives the first new image instead of leaving an empty page behind */
export function canFillFirstPage(firstPage: FillablePage | undefined, firstData: FillData | undefined) {
    return !!firstPage && !firstPage.imagePath && !firstPage.pkpass_id && !!firstData && !firstData.id && !!(firstData.imagePath || firstData.image);
}
