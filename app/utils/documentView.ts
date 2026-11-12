import type { OCRDocument, OCRPage } from '~/models/OCRDocument';
import { DocumentDeletedEventData, DocumentPageDeletedEventData, DocumentPageUpdatedEventData, DocumentPagesAddedEventData, DocumentUpdatedEventData, documentsService } from '~/services/documents';
import { EVENT_DOCUMENT_DELETED, EVENT_DOCUMENT_PAGES_ADDED, EVENT_DOCUMENT_PAGE_DELETED, EVENT_DOCUMENT_PAGE_UPDATED, EVENT_DOCUMENT_UPDATED } from '~/utils/constants';

/** listens to the changes of the documents, returns the function which stops it */
export function subscribeDocumentEvents(handlers: {
    updated: (event: DocumentUpdatedEventData) => void;
    deleted: (event: DocumentDeletedEventData) => void;
    pageDeleted: (event: DocumentPageDeletedEventData) => void;
    pageUpdated: (event: DocumentPageUpdatedEventData) => void;
    pagesAdded: (event: DocumentPagesAddedEventData) => void;
}) {
    const listeners: [string, (event: never) => void][] = [
        [EVENT_DOCUMENT_UPDATED, handlers.updated],
        [EVENT_DOCUMENT_DELETED, handlers.deleted],
        [EVENT_DOCUMENT_PAGE_DELETED, handlers.pageDeleted],
        [EVENT_DOCUMENT_PAGE_UPDATED, handlers.pageUpdated],
        [EVENT_DOCUMENT_PAGES_ADDED, handlers.pagesAdded]
    ];
    listeners.forEach(([eventName, handler]) => documentsService.on(eventName, handler));
    return () => listeners.forEach(([eventName, handler]) => documentsService.off(eventName, handler));
}

/** the selected pages of a view, with their index in the document */
export function getSelectedPages(items: { forEach(callback: (item: { page: OCRPage; selected: boolean }, index: number) => void): void }, document: OCRDocument) {
    const selected: { page: OCRPage; pageIndex: number; document: OCRDocument }[] = [];
    items.forEach((item, index) => {
        if (item.selected) {
            selected.push({ page: item.page, document, pageIndex: index });
        }
    });
    return selected;
}
