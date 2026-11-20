import type { DocFolder, OCRDocument } from '~/models/OCRDocument';
import type { RowPosition } from '~/utils/groupedRows';

export interface Item {
    type?: string;
    doc?: OCRDocument;
    folder?: DocFolder;
    selected: boolean;
    startingSide?: string;
    position?: RowPosition;
}
