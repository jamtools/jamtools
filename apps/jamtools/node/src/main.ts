import {CoreDependencies} from '~/core/types/module_types';

import {TrpcKVStoreService} from '~/core/services/trpc_kv_store_client';

import {NodeKVStoreService} from '~/platforms/node/services/node_kvstore_service';
import {NodeJsonRpcClientAndServer} from '~/platforms/node/services/node_json_rpc';
import {JamToolsEngine} from '~/core/engine/engine';
import {MidiService, QwertyService} from '~/core/types/io_types';

const WS_HOST = process.env.WS_HOST || 'ws://localhost:1337';
const DATA_HOST = process.env.DATA_HOST || 'http://localhost:1337';

type Services = {
    qwerty: QwertyService;
    midi: MidiService;
}

export const startJamTools = async (services: Services): Promise<JamToolsEngine> => {
    const kvStore = new TrpcKVStoreService(DATA_HOST);
    // const kvStore = new NodeKVStoreService('persistent');

    const sessionStore = new NodeKVStoreService('session');
    const rpc = new NodeJsonRpcClientAndServer(`${WS_HOST}/ws?is_maestro=true`, sessionStore);

    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: console.error,
        inputs: {
            qwerty: services.qwerty,
            midi: services.midi,
        },
        storage: {
            remote: kvStore,
            userAgent: sessionStore,
        },
        rpc,
        isMaestro: () => true,
    };

    const engine = new JamToolsEngine(coreDeps);

    await engine.initialize();
    return engine;
};
