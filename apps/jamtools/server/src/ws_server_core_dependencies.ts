import fs from 'fs';

import {makeKyselySqliteInstance} from 'springboard-data-storage/sqlite_db';

import {KyselyKVStore} from 'springboard-data-storage/kv_store_db_types';

import {makeKVTrpcRouter, type KVTrpcRouter} from 'springboard-data-storage/kv_api_trpc';

export type WebsocketServerCoreDependencies = {
    kvDatabase: KyselyKVStore;
    kvTrpcRouter: KVTrpcRouter;
};

export const makeWebsocketServerCoreDependenciesWithSqlite = async (): Promise<WebsocketServerCoreDependencies> => {
    await fs.promises.mkdir('data', {recursive: true});
    const db = await makeKyselySqliteInstance('data/kv.db');

    return {
        kvDatabase: db,
        kvTrpcRouter: makeKVTrpcRouter(db),
    };
};
