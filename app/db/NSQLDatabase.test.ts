import { beforeEach, describe, expect, it, vi } from 'vitest';
import SqlQuery from 'kiss-orm/dist/Queries/SqlQuery';

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock('@nativescript-community/sqlite', () => ({
    openOrCreate: vi.fn(() => ({ execute, select: vi.fn(), close: vi.fn(), isOpen: true }))
}));
vi.mock('@akylas/nativescript-app-utils/error', () => ({ NoSpaceLeftError: class NoSpaceLeftError extends Error {} }));
vi.mock('kiss-orm/dist/Databases/Common/migrate', () => ({ default: vi.fn() }));

import NSQLDatabase from './NSQLDatabase';

function fakeQuery(sql: string, params: any[] = []) {
    return { compile: () => ({ sql, params }) } as unknown as SqlQuery;
}

describe('NSQLDatabase', () => {
    beforeEach(() => {
        execute.mockReset();
    });

    // sqlite 4 resolves execute() with { changes, lastInsertRowId }: handing it to kiss-orm would
    // make it build the model from that object instead of the inserted attributes
    it('insertAndGet resolves [undefined] whatever execute resolves', async () => {
        execute.mockResolvedValue({ changes: 1, lastInsertRowId: 5 });
        const db = new NSQLDatabase('test.db');
        expect(await db.insertAndGet(fakeQuery('INSERT INTO t(a) VALUES (?)', [1]))).toEqual([undefined]);
        expect(execute).toHaveBeenCalledWith('INSERT INTO t(a) VALUES (?)', [1]);
    });

    it('updateAndGet resolves [undefined] whatever execute resolves', async () => {
        execute.mockResolvedValue({ changes: 1, lastInsertRowId: 5 });
        const db = new NSQLDatabase('test.db');
        expect(await db.updateAndGet(fakeQuery('UPDATE t SET a = ?', [1]))).toEqual([undefined]);
    });
});
