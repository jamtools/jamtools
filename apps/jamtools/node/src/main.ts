import {CoreDependencies} from '~/core/types/module_types';

import {NodeQwertyService} from '~/platforms/node/services/node_qwerty_service';
import {NodeKVStoreService} from '~/platforms/node/services/node_kvstore_service';
import {NodeMidiService} from '~/platforms/node/services/node_midi_service';
import {NodeJsonRpcClientAndServer} from '~/platforms/node/services/node_json_rpc';
import {JamToolsEngine} from '~/core/engine/engine';

const WS_HOST = process.env.WS_HOST || 'ws://jam.local:1337';

export const startJamTools = async (): Promise<JamToolsEngine> => {
    const qwertyService = new NodeQwertyService();
    const kvStore = new NodeKVStoreService('persistent');
    const midiService = new NodeMidiService();

    const sessionStore = new NodeKVStoreService('session');
    const rpc = new NodeJsonRpcClientAndServer(`${WS_HOST}/ws?is_maestro=true`, sessionStore);

    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: console.error,
        inputs: {
            qwerty: qwertyService,
            midi: midiService,
        },
        kvStore,
        rpc,
        isMaestro: () => true,
    };

    const engine = new JamToolsEngine(coreDeps);

    await engine.initialize();
    return engine;
};
