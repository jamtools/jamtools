import fs from 'fs';

import {makeKyselySqliteInstance} from '@springboardjs/data-storage/sqlite_db';

import {KyselyDBWithKVStoreTable} from '@springboardjs/data-storage/kv_store_db_types';

import {KVStoreFromKysely} from '@springboardjs/data-storage/kv_api_kysely';
import type {DatabaseDependencies} from 'springboard-server/types';

const SQLITE_DATABASE_FILE = process.env.SQLITE_DATABASE_FILE || 'data/kv.db';

export const makeWebsocketServerCoreDependenciesWithSqlite = async (): Promise<DatabaseDependencies> => {
    if (SQLITE_DATABASE_FILE.startsWith('data/')) {
        await fs.promises.mkdir('data', {recursive: true});
    }

    const db = await makeKyselySqliteInstance(SQLITE_DATABASE_FILE);

    return {
        kvDatabase: db,
        kvStoreFromKysely: new KVStoreFromKysely(db),
    };
};