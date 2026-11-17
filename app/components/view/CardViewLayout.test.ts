import { describe, expect, it } from 'vitest';
import { CARD_RATIO } from '~/utils/constants';
import { CODE_ZONE_HEIGHT, FILMSTRIP_COL_WIDTH, FILMSTRIP_HEIGHT, PHOTO_INSET, PHOTO_SHADOW_ROOM, PEEK_WIDTH, getCardViewLayout, getFilmstripLayout } from './CardViewLayout';

const base = { bleed: 0, sideBySide: false, landscape: false, hasQRCodes: false, hasImages: true, multiplePhotos: false, multipleQR: false, paneWidth: 400, pageHeight: 800 };

describe('getCardViewLayout in portrait', () => {
    it('has no card width of its own: the photo takes the width of its page', () => {
        expect(getCardViewLayout(base).photoCardWidth).toBeUndefined();
    });

    it('sizes the photo from the width, with the inset of the peeking neighbors only for several photos', () => {
        expect(getCardViewLayout(base).photoCardHeight).toBe(Math.round((400 - 32) * CARD_RATIO));
        expect(getCardViewLayout({ ...base, multiplePhotos: true }).photoCardHeight).toBe(Math.round((400 - PHOTO_INSET) * CARD_RATIO));
    });

    it('keeps the room of the shadow under the photo', () => {
        const { photoCardHeight, photoPagerHeight } = getCardViewLayout(base);
        expect(photoPagerHeight).toBe(photoCardHeight + PHOTO_SHADOW_ROOM);
    });

    it('has a code zone of a constant height and no width of its own', () => {
        expect(getCardViewLayout({ ...base, hasQRCodes: true })).toMatchObject({ qrZoneHeight: CODE_ZONE_HEIGHT, qrZoneWidth: undefined });
        expect(getCardViewLayout({ ...base, hasQRCodes: true, multipleQR: true }).qrZoneHeight).toBe(CODE_ZONE_HEIGHT + 32);
    });
});

describe('getCardViewLayout in landscape', () => {
    const landscape = { ...base, landscape: true, paneWidth: 800, pageHeight: 402 };

    it('gives photos alone the whole height of the page', () => {
        // 402 - 16 (margin) - the shadow room
        expect(getCardViewLayout(landscape).photoCardHeight).toBe(402 - 16 - PHOTO_SHADOW_ROOM);
    });

    it('gives the card the width of its ratio, the page is wider than it', () => {
        const { photoCardHeight, photoCardWidth } = getCardViewLayout(landscape);
        expect(photoCardWidth).toBe(Math.round(photoCardHeight / CARD_RATIO));
    });

    it('leaves the room of the strip to several photos', () => {
        const single = getCardViewLayout(landscape).photoCardHeight;
        expect(getCardViewLayout({ ...landscape, multiplePhotos: true }).photoCardHeight).toBe(single - FILMSTRIP_HEIGHT - 16);
    });

    it('does not let the card be wider than its pane', () => {
        const narrow = getCardViewLayout({ ...landscape, paneWidth: 300 });
        expect(narrow.photoCardHeight).toBe(Math.round((300 - 32) * CARD_RATIO));
    });

    it('keeps the room of the peeking neighbors to several photos in a narrow pane', () => {
        const narrow = getCardViewLayout({ ...landscape, multiplePhotos: true, paneWidth: 300 });
        expect(narrow.photoCardHeight).toBe(Math.round((300 - PHOTO_INSET) * CARD_RATIO));
        expect(narrow.photoCardWidth).toBeLessThanOrEqual(300 - PHOTO_INSET);
    });

    it('peeks the neighbors by what the card leaves of the pane, the portrait peek at least', () => {
        const wide = getCardViewLayout({ ...landscape, multiplePhotos: true });
        expect(wide.photoPeaking).toBe(PEEK_WIDTH + (800 - (wide.photoCardWidth ?? 0) - PHOTO_INSET) / 2);
        expect(getCardViewLayout({ ...landscape, multiplePhotos: true, paneWidth: 300 }).photoPeaking).toBeGreaterThanOrEqual(PEEK_WIDTH);
    });

    it('lets the neighbors take the bleed of the pager too: it goes under the safe area', () => {
        const several = { ...landscape, multiplePhotos: true };
        const plain = getCardViewLayout(several);
        const bled = getCardViewLayout({ ...several, bleed: 60 });
        expect(bled.photoCardWidth).toBe(plain.photoCardWidth);
        expect(bled.photoPeaking).toBe(plain.photoPeaking + 60);
    });

    it('has no peek for a single photo, and the portrait one for several', () => {
        expect(getCardViewLayout(landscape).photoPeaking).toBe(0);
        expect(getCardViewLayout({ ...base, multiplePhotos: true }).photoPeaking).toBe(PEEK_WIDTH);
    });

    it('keeps the size of the portrait for photos which share the page with a code', () => {
        expect(getCardViewLayout({ ...landscape, hasQRCodes: true }).photoCardHeight).toBe(Math.round((800 - 32) * CARD_RATIO));
    });

    it('gives a code alone the whole height, and a width which follows it', () => {
        const alone = getCardViewLayout({ ...landscape, hasQRCodes: true, hasImages: false });
        expect(alone.qrZoneHeight).toBe(402 - 16);
        expect(alone.qrZoneWidth).toBe(alone.qrZoneHeight + 60);
    });

    it('gives photos and code side by side the whole height each, the strip under the photos', () => {
        const both = getCardViewLayout({ ...landscape, hasQRCodes: true, sideBySide: true });
        expect(both.photoCardHeight).toBe(402 - 16 - PHOTO_SHADOW_ROOM);
        expect(both.qrZoneHeight).toBe(402 - 16);
        expect(getCardViewLayout({ ...landscape, hasQRCodes: true, sideBySide: true, multiplePhotos: true }).photoCardHeight).toBe(402 - 16 - PHOTO_SHADOW_ROOM - FILMSTRIP_HEIGHT - 16);
    });

    it('has no negative size before the page is measured', () => {
        const unmeasured = getCardViewLayout({ ...landscape, hasQRCodes: true, sideBySide: true, multiplePhotos: true, pageHeight: 0 });
        expect(unmeasured.photoCardHeight).toBeGreaterThanOrEqual(0);
        expect(unmeasured.photoCardWidth).toBeGreaterThanOrEqual(0);
        expect(unmeasured.photoPagerHeight).toBeGreaterThanOrEqual(0);
    });

    it('keeps the minimum height of the code zone on a small screen', () => {
        expect(getCardViewLayout({ ...landscape, hasQRCodes: true, hasImages: false, pageHeight: 200 }).qrZoneHeight).toBe(CODE_ZONE_HEIGHT);
    });

    it('adds the peek of the neighbors to the width of several codes, within the pane', () => {
        const several = getCardViewLayout({ ...landscape, hasQRCodes: true, hasImages: false, multipleQR: true });
        expect(several.qrZoneWidth).toBe(Math.min(several.qrZoneHeight - 32 + 60 + 2 * PEEK_WIDTH, 800));
    });
});

describe('getFilmstripLayout', () => {
    it('centers thumbnails which all fit, and does not scroll', () => {
        const { padding, scrollable } = getFilmstripLayout(2, 400);
        expect(scrollable).toBe(false);
        expect(padding).toBe((400 - 2 * FILMSTRIP_COL_WIDTH) / 2);
    });

    it('scrolls when some are off screen, and lets the first and the last reach the center', () => {
        const { padding, scrollable } = getFilmstripLayout(Math.ceil(400 / FILMSTRIP_COL_WIDTH) + 1, 400);
        expect(scrollable).toBe(true);
        expect(padding).toBe((400 - FILMSTRIP_COL_WIDTH) / 2);
    });

    it('does not scroll when the thumbnails exactly fill the width', () => {
        expect(getFilmstripLayout(4, 4 * FILMSTRIP_COL_WIDTH).scrollable).toBe(false);
    });

    it('has no negative padding in a narrow pane', () => {
        expect(getFilmstripLayout(1, 10).padding).toBeGreaterThanOrEqual(0);
        expect(getFilmstripLayout(5, 10).padding).toBeGreaterThanOrEqual(0);
    });
});
