import type {KVTrpcRouter} from '@springboardjs/data-storage/kv_api_trpc';

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
    private trpc: ReturnType<typeof createKVStoreTrpcClient>;

    constructor(serverUrl: string) {
        this.trpc = createKVStoreTrpcClient(serverUrl);
    }

    getAll = async () => {
        const allEntries = await this.trpc.kvGetAll.query();
        if (!allEntries) {
            return null;
        }

        const entriesAsRecord: Record<string, any> = {};
        for (const entry of allEntries) {
            entriesAsRecord[entry.key] = JSON.parse(entry.value);
        }

        return entriesAsRecord;
    };

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
