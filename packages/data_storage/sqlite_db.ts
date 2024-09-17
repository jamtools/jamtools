import SQLite from 'better-sqlite3';
import {Kysely, SqliteDialect} from 'kysely';

import {KyselyKVStore} from './kv_store_db_types';

let db: KyselyKVStore | undefined;

export const makeKyselySqliteInstance = async (fname: string): Promise<KyselyKVStore> => {
    if (db) {
        return db;
    }

    const dialect = new SqliteDialect({
        database: new SQLite(fname),
    });

    db = new Kysely({
        dialect,
    });

    await ensureKVTable(db);

    return db;
}

const ensureKVTable = async (db: KyselyKVStore) => {
    await db.schema.createTable('kvstore')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey())
    .addColumn('key', 'text', (col) => col.notNull().unique())
    .addColumn('value', 'text', (col) => col.notNull())
    // .addColumn('workspace', 'varchar(255)', (col) => col.notNull())
    // .addColumn('store', 'varchar(255)', (col) => col.notNull())
    .execute();

    // const indexColumns = ['key', 'value', 'workspace', 'store'] as const;

    // for (const colName of indexColumns) {
    //     await db.schema.alterTable('kvstore')
    //     .addIndex(colName + '__index')
    //     .column(colName)
    //     .execute();
    // }
}
