import SqlQuery from 'kiss-orm/dist/Queries/SqlQuery';
import DatabaseInterface from 'kiss-orm/dist/Databases/DatabaseInterface';
import migrate from 'kiss-orm/dist/Databases/Common/migrate';
import { DatabaseOptions, SQLiteDatabase, openOrCreate } from '@nativescript-community/sqlite';
import { NoSpaceLeftError } from '@akylas/nativescript-app-utils/error';

function formatIdentifier(i: string): string {
    return i;
}

export default class NSQLDatabase implements DatabaseInterface {
    db: SQLiteDatabase;
    constructor(filePath: string, options?: DatabaseOptions) {
        this.db = openOrCreate(filePath, options);
    }

    async disconnect(): Promise<void> {
        return this.db.close();
    }
    isOpen(): boolean {
        return this.db.isOpen;
    }

    indexToPlaceholder(i: number): string {
        return '?';
    }

    wrapAndThrowError(error) {
        if (/SQLITE_IOERR_FSYNC|ENOSPC/.test(error)) {
            throw new NoSpaceLeftError(error);
        } else {
            throw error;
        }
    }

    async query(query: SqlQuery): Promise<any[]> {
        const compiledQuery = query.compile(this.indexToPlaceholder, formatIdentifier);
        const sqlQuery = compiledQuery.sql.trim();
        try {
            const result = await this.db.select(sqlQuery, [...compiledQuery.params]);
            return result as any[];
        } catch (error) {
            this.wrapAndThrowError(error);
        }
    }
    async sequence<T>(sequence: (sequenceDb: NSQLDatabase) => Promise<T>): Promise<T> {
        return sequence(this);
    }

    async migrate(migrations: { [key: string]: SqlQuery }) {
        await migrate(this, migrations);
    }

    async insertAndGet(standardInsertQuery: SqlQuery): Promise<number[] | string[] | any[]> {
        const compiledQuery = standardInsertQuery.compile(this.indexToPlaceholder, formatIdentifier);
        const sqlQuery = compiledQuery.sql.trim();
        try {
            await this.db.execute(sqlQuery, [...compiledQuery.params]);
            // the rowid is not the primary key of every table: let kiss-orm use the inserted attributes
            return [undefined];
        } catch (error) {
            this.wrapAndThrowError(error);
        }
    }

    async updateAndGet(standardUpdateQuery: SqlQuery): Promise<null | any[]> {
        return this.insertAndGet(standardUpdateQuery);
    }
}
