import { CARD_RATIO } from '~/utils/constants';

export const CODE_ZONE_HEIGHT = 270;
// the thumbnails of the pages have the ratio of the pages: cards are wide
export const FILMSTRIP_CELL_MARGIN = 4;
export const FILMSTRIP_COL_WIDTH = CARD_APP ? 76 : 48;
// a card has rounded corners of a tenth of its height
export const FILMSTRIP_THUMBNAIL_RADIUS = CARD_APP ? 4 : 6;
export const FILMSTRIP_HEIGHT = CARD_APP ? Math.round((FILMSTRIP_COL_WIDTH - 2 * FILMSTRIP_CELL_MARGIN) * CARD_RATIO) + 2 * FILMSTRIP_CELL_MARGIN : 60;
// room under the photo for its shadow
export const PHOTO_SHADOW_ROOM = 12;
export const PEEK_WIDTH = 44;
// what the pager keeps on both sides of a photo with several photos (the peek of the neighbors and the gap), measured on each platform
export const PHOTO_INSET = __IOS__ ? 110 : 88;
// a photo alone only keeps the margin of the page
const SINGLE_PHOTO_INSET = 32;
// the code card is a square and its text, a margin around it
const CODE_CARD_EXTRA_WIDTH = 60;
// the dots which tell the several codes
const CODE_INDICATOR_HEIGHT = 32;
// landscape: the room kept around the zones of the page
const LANDSCAPE_MARGIN = 16;

export interface CardViewLayoutInput {
    landscape: boolean;
    hasQRCodes: boolean;
    hasImages: boolean;
    multiplePhotos: boolean;
    multipleQR: boolean;
    /** landscape: the photos and the codes are the two columns of the page (there are no details) */
    sideBySide: boolean;
    /** iOS landscape: how far the pager goes under the safe area, on each side of the pane (0 else) */
    bleed: number;
    /** the width the zones can take: the screen in portrait, its half or all of it in landscape */
    paneWidth: number;
    /** the measured height of the page: it starts under the bar, in landscape the zones take what it has */
    pageHeight: number;
}

export interface CardViewLayout {
    photoCardHeight: number;
    /** landscape: the card is narrower than its page, it has the width of its ratio */
    photoCardWidth: number | undefined;
    /** the card and the room of its shadow */
    photoPagerHeight: number;
    /** what the pager shows of the neighbors: in landscape the card is narrower than its pane, the neighbors take the rest */
    photoPeaking: number;
    qrZoneHeight: number;
    /** landscape: the zone does not stretch over the pane */
    qrZoneWidth: number | undefined;
}

/**
 * The sizes of the zones of a card. In portrait they come from the width of the screen. In landscape what is alone on the page takes
 * the whole height of the page, as do a photo and a code side by side; a photo and a code with details keep their portrait size (the page scrolls)
 */
export function getCardViewLayout({ bleed, hasImages, hasQRCodes, landscape, multiplePhotos, multipleQR, pageHeight, paneWidth, sideBySide }: CardViewLayoutInput): CardViewLayout {
    const roomHeight = pageHeight - LANDSCAPE_MARGIN;
    const photoInset = multiplePhotos ? PHOTO_INSET : SINGLE_PHOTO_INSET;
    const photoHeightFromWidth = (paneWidth - photoInset) * CARD_RATIO;
    const photoAlone = landscape && (!hasQRCodes || sideBySide);
    // before the page is measured there is no room: not a negative size
    const photoCardHeight = Math.max(
        0,
        Math.round(photoAlone ? Math.min(roomHeight - PHOTO_SHADOW_ROOM - (multiplePhotos ? FILMSTRIP_HEIGHT + LANDSCAPE_MARGIN : 0), photoHeightFromWidth) : photoHeightFromWidth)
    );
    const photoCardWidth = landscape ? Math.round(photoCardHeight / CARD_RATIO) : undefined;
    const codeIndicatorHeight = multipleQR ? CODE_INDICATOR_HEIGHT : 0;
    const codeAlone = landscape && (!hasImages || sideBySide);
    const qrZoneHeight = Math.max(CODE_ZONE_HEIGHT, codeAlone ? roomHeight : 0) + codeIndicatorHeight;
    return {
        photoCardHeight,
        photoCardWidth,
        photoPagerHeight: photoCardHeight + PHOTO_SHADOW_ROOM,
        photoPeaking: !multiplePhotos ? 0 : landscape ? PEEK_WIDTH + (paneWidth + 2 * bleed - photoCardWidth - PHOTO_INSET) / 2 : PEEK_WIDTH,
        qrZoneHeight,
        qrZoneWidth: landscape ? Math.min(qrZoneHeight - codeIndicatorHeight + CODE_CARD_EXTRA_WIDTH + (multipleQR ? 2 * PEEK_WIDTH : 0), paneWidth) : undefined
    };
}
