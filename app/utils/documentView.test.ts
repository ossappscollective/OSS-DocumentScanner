import { describe, expect, it, vi } from 'vitest';

const { listeners } = vi.hoisted(() => ({ listeners: new Map<string, Set<(event: unknown) => void>>() }));

vi.mock('~/services/documents', () => ({
    documentsService: {
        on: (eventName: string, callback: (event: unknown) => void) => {
            if (!listeners.has(eventName)) {
                listeners.set(eventName, new Set());
            }
            listeners.get(eventName).add(callback);
        },
        off: (eventName: string, callback: (event: unknown) => void) => listeners.get(eventName)?.delete(callback)
    }
}));

import { EVENT_DOCUMENT_DELETED, EVENT_DOCUMENT_PAGES_ADDED, EVENT_DOCUMENT_PAGE_DELETED, EVENT_DOCUMENT_PAGE_UPDATED, EVENT_DOCUMENT_UPDATED } from '~/utils/constants';
import { getSelectedPages, subscribeDocumentEvents } from './documentView';

describe('subscribeDocumentEvents', () => {
    function createHandlers() {
        return { updated: vi.fn(), deleted: vi.fn(), pageDeleted: vi.fn(), pageUpdated: vi.fn(), pagesAdded: vi.fn() };
    }
    function emit(eventName: string, event: unknown) {
        listeners.get(eventName)?.forEach((callback) => callback(event));
    }

    it('routes each event of the service to its handler', () => {
        const handlers = createHandlers();
        const unsubscribe = subscribeDocumentEvents(handlers);
        emit(EVENT_DOCUMENT_UPDATED, 'updated');
        emit(EVENT_DOCUMENT_DELETED, 'deleted');
        emit(EVENT_DOCUMENT_PAGE_DELETED, 'pageDeleted');
        emit(EVENT_DOCUMENT_PAGE_UPDATED, 'pageUpdated');
        emit(EVENT_DOCUMENT_PAGES_ADDED, 'pagesAdded');
        expect(handlers.updated).toHaveBeenCalledWith('updated');
        expect(handlers.deleted).toHaveBeenCalledWith('deleted');
        expect(handlers.pageDeleted).toHaveBeenCalledWith('pageDeleted');
        expect(handlers.pageUpdated).toHaveBeenCalledWith('pageUpdated');
        expect(handlers.pagesAdded).toHaveBeenCalledWith('pagesAdded');
        unsubscribe();
    });
    it('stops routing the events after the unsubscribe', () => {
        const handlers = createHandlers();
        subscribeDocumentEvents(handlers)();
        emit(EVENT_DOCUMENT_UPDATED, 'updated');
        emit(EVENT_DOCUMENT_PAGES_ADDED, 'pagesAdded');
        expect(handlers.updated).not.toHaveBeenCalled();
        expect(handlers.pagesAdded).not.toHaveBeenCalled();
    });
});

describe('getSelectedPages', () => {
    const document: any = { id: 'doc' };
    const items = [
        { page: { id: 'a' }, selected: false },
        { page: { id: 'b' }, selected: true },
        { page: { id: 'c' }, selected: false },
        { page: { id: 'd' }, selected: true }
    ] as any[];

    it('lists the selected pages with their document and index', () => {
        expect(getSelectedPages(items, document)).toEqual([
            { page: { id: 'b' }, document, pageIndex: 1 },
            { page: { id: 'd' }, document, pageIndex: 3 }
        ]);
    });
    it('is empty without a selection', () => {
        expect(
            getSelectedPages(
                items.map((item) => ({ ...item, selected: false })),
                document
            )
        ).toEqual([]);
    });
});
