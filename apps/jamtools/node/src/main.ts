import {JSDOM} from 'jsdom';

import {CoreDependencies} from '~/core/types/module_types';

import {TrpcKVStoreService} from '~/core/services/trpc_kv_store_client';

import {NodeKVStoreService} from '~/platforms/node/services/node_kvstore_service';
import {NodeJsonRpcClientAndServer} from '~/platforms/node/services/node_json_rpc';
import {JamToolsEngine} from '~/core/engine/engine';
import {MidiService, QwertyService} from '~/core/types/io_types';
import {ExtraModuleDependencies} from '~/core/module_registry/module_registry';
import {UltimateGuitarService} from '~/features/modules/ultimate_guitar/ultimate_guitar_service';

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
        kvStore,
        rpc,
        isMaestro: () => true,
    };

    const extraDeps: ExtraModuleDependencies = {
        Ultimate_Guitar: {
            domParser: (htmlData: string) => new JSDOM(htmlData).window.document,
            ultimateGuitarService: new UltimateGuitarService(),
        },
    };

    const engine = new JamToolsEngine(coreDeps, extraDeps);

    await engine.initialize();
    return engine;
};
