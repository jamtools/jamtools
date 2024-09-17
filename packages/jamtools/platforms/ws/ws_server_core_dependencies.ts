import {makeKyselySqliteInstance} from '../../../data_storage/sqlite_db';

import {KyselyKVStore} from '../../../data_storage/kv_store_db_types';

import {makeKVTrpcRouter, type KVTrpcRouter} from '../../../data_storage/kv_api_trpc';

export type WebsocketServerCoreDependencies = {
    kvDatabase: KyselyKVStore;
    kvTrpcRouter: KVTrpcRouter;
};

export const makeWebsocketServerCoreDependenciesWithSqlite = async (): Promise<WebsocketServerCoreDependencies> => {
    const db = await makeKyselySqliteInstance('kv.db');

    return {
        kvDatabase: db,
        kvTrpcRouter: makeKVTrpcRouter(db),
    };
};
