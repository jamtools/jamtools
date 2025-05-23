import fs from 'fs';

import {makeKyselySqliteInstance} from '@springboardjs/data-storage/sqlite_db';

import {KyselyKVStore} from '@springboardjs/data-storage/kv_store_db_types';

import {makeKVTrpcRouter, type KVTrpcRouter} from '@springboardjs/data-storage/kv_api_trpc';

export type WebsocketServerCoreDependencies = {
    kvDatabase: KyselyKVStore;
    kvTrpcRouter: KVTrpcRouter;
};

const SQLITE_DATABASE_FILE = process.env.SQLITE_DATABASE_FILE || 'data/kv.db';

export const makeWebsocketServerCoreDependenciesWithSqlite = async (): Promise<WebsocketServerCoreDependencies> => {
    if (SQLITE_DATABASE_FILE.startsWith('data/')) {
        await fs.promises.mkdir('data', {recursive: true});
    }

    const db = await makeKyselySqliteInstance(SQLITE_DATABASE_FILE);

    return {
        kvDatabase: db,
        kvTrpcRouter: makeKVTrpcRouter(db),
    };
};
