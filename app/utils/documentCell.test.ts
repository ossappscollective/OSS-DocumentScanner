import { describe, expect, it } from 'vitest';
import { getInfoPill, getPaperEdge, getSyncDots, getSyncedServices, getTileRadius, isAutoName } from './documentCell';

describe('isAutoName', () => {
    it('is true without a name', () => {
        expect(isAutoName(undefined)).toBe(true);
        expect(isAutoName('')).toBe(true);
    });
    it('is true for the default timestamp name', () => {
        expect(isAutoName('10/27/2026 11:39:12 PM')).toBe(true);
    });
    it('is false for a user name', () => {
        expect(isAutoName('Rental contract')).toBe(false);
    });
});

describe('getSyncDots', () => {
    it('shows all the colors up to the max', () => {
        expect(getSyncDots(['#111111', '#222222'], 5)).toEqual({ shown: ['#111111', '#222222'], more: 0 });
    });
    it('counts the colors over the max', () => {
        const colors = ['#1', '#2', '#3', '#4', '#5', '#6', '#7'];
        expect(getSyncDots(colors, 5)).toEqual({ shown: colors.slice(0, 5), more: 2 });
    });
    it('has nothing for a document synced nowhere', () => {
        expect(getSyncDots([], 5)).toEqual({ shown: [], more: 0 });
    });
});

describe('getInfoPill', () => {
    it('hides the page count of a single page', () => {
        expect(getInfoPill(1, false)).toEqual({ pages: false, favorite: false, divider: false, visible: false });
    });
    it('shows the page count over one page', () => {
        expect(getInfoPill(6, false)).toEqual({ pages: true, favorite: false, divider: false, visible: true });
    });
    it('shows a lone favorite', () => {
        expect(getInfoPill(1, true)).toEqual({ pages: false, favorite: true, divider: false, visible: true });
    });
    it('splits the page count and the favorite with a divider', () => {
        expect(getInfoPill(3, true)).toEqual({ pages: true, favorite: true, divider: true, visible: true });
    });
});

describe('getTileRadius', () => {
    it('is 18% of the shorter side', () => {
        expect(getTileRadius(100, 141)).toBe(18);
    });
    it('is at least 8', () => {
        expect(getTileRadius(30, 42)).toBe(8);
    });
    it('is at most 28', () => {
        expect(getTileRadius(250, 352)).toBe(28);
    });
});

describe('getSyncedServices', () => {
    const masks = { webdav_pdf: 1 << 6, gdrive_pdf: 1 << 9, folder_pdf: 1 << 4 };
    const defaultColors = { webdav_pdf: '#8293CE', gdrive_pdf: '#FBBC05', folder_pdf: '#4CA49D' };
    const services = [{ type: 'webdav_pdf' }, { type: 'gdrive_pdf', color: '#112233' }, { type: 'folder_pdf' }];

    it('has every service for a document synced everywhere (1)', () => {
        expect(getSyncedServices(1, services, masks, defaultColors)).toEqual([
            { type: 'webdav_pdf', color: '#8293CE' },
            { type: 'gdrive_pdf', color: '#112233' },
            { type: 'folder_pdf', color: '#4CA49D' }
        ]);
    });
    it('has the services whose bit is set', () => {
        expect(getSyncedServices(1 << 6, services, masks, defaultColors)).toEqual([{ type: 'webdav_pdf', color: '#8293CE' }]);
    });
    it('uses the color set on the service over the default one', () => {
        expect(getSyncedServices(1 << 9, services, masks, defaultColors)).toEqual([{ type: 'gdrive_pdf', color: '#112233' }]);
    });
    it('has nothing for a document synced nowhere', () => {
        expect(getSyncedServices(0, services, masks, defaultColors)).toEqual([]);
    });
});

describe('getPaperEdge', () => {
    it('is a soft shadow on iOS', () => {
        expect(getPaperEdge(true, false, '#C4C6D0')).toEqual({ boxShadow: '0 2 10 #0000006C' });
    });
    it('is a 1 outline on Android', () => {
        expect(getPaperEdge(false, false, '#C4C6D0')).toEqual({ borderColor: '#C4C6D0', borderWidth: 1 });
    });
    it('is a 1 outline on e-ink, whatever the platform', () => {
        expect(getPaperEdge(true, true, '#000000')).toEqual({ borderColor: '#000000', borderWidth: 1 });
    });
});
