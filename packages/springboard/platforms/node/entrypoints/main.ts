import {JSDOM} from 'jsdom';

import {CoreDependencies} from 'springboard/types/module_types';

import {TrpcKVStoreService} from 'springboard/services/trpc_kv_store_client';

import {NodeKVStoreService} from '@springboardjs/platforms-node/services/node_kvstore_service';
import {NodeFileStorageService} from '@springboardjs/platforms-node/services/node_file_storage_service';
import {NodeJsonRpcClientAndServer} from '@springboardjs/platforms-node/services/node_json_rpc';
import {Springboard} from 'springboard/engine/engine';
import {ExtraModuleDependencies} from 'springboard/module_registry/module_registry';

const port = process.env.PORT || 1337;

const WS_HOST = process.env.WS_HOST || `ws://localhost:${port}`;
const DATA_HOST = process.env.DATA_HOST || `http://localhost:${port}`;

export const startNodeApp = async (): Promise<Springboard> => {
    const kvStore = new TrpcKVStoreService(DATA_HOST);
    // const kvStore = new NodeKVStoreService('persistent');

    const sessionStore = new NodeKVStoreService('session');
    const rpc = new NodeJsonRpcClientAndServer(`${WS_HOST}/ws?is_maestro=true`, sessionStore);

    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: console.error,
        storage: {
            remote: kvStore,
            userAgent: sessionStore,
        },
        files: new NodeFileStorageService(),
        rpc,
        isMaestro: () => true,
    };

    const extraDeps: ExtraModuleDependencies = {
    };

    const engine = new Springboard(coreDeps, extraDeps);

    await engine.initialize();
    return engine;
};
