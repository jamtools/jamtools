import type {KVTrpcRouter} from '../../../../packages/data_storage/kv_api_trpc';

import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import {KVStore} from '../types/module_types';

const createKVStoreTrpcClient = (serverUrl: string) => {
    return createTRPCProxyClient<KVTrpcRouter>({
        links: [
            httpBatchLink({
                url: `${serverUrl}/trpc`,
            }),
        ],
    });
};

export class TrpcKVStoreService implements KVStore {
    constructor(private serverUrl: string) {}
    private trpc = createKVStoreTrpcClient(this.serverUrl);

    get = async <T>(key: string) => {
        const result = await this.trpc.kvGet.query({key});
        if (!result) {
            return null;
        }

        return JSON.parse(result) as T;
    };

    set = async <T>(key: string, value: T) => {
        const serialized = JSON.stringify(value);
        await this.trpc.kvPut.mutate({key, value: serialized});
    };
}
