import SQLite from 'better-sqlite3';
import {Dialect, Kysely, SqliteDialect} from 'kysely';

import {KyselyKVStore} from './kv_store_db_types';

export const makeKyselySqliteInstance = async (fname: string) => {
    const dialect = new SqliteDialect({
        database: new SQLite(fname),
    });

    return makeKyselyInstanceFromDialect(dialect);
};

export const makeKyselyInstanceFromDialect = async (dialect: Dialect): Promise<KyselyKVStore> => {
    const db = new Kysely({
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
