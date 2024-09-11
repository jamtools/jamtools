import {Subject} from 'rxjs';

import {CoreDependencies} from '~/core/types/module_types';

// import {NodeQwertyService} from '~/platforms/node/services/node_qwerty_service';
import {NodeKVStoreService} from '~/platforms/node/services/node_kvstore_service';
// import {NodeMidiService} from '~/platforms/node/services/node_midi_service';
import {NodeJsonRpcClientAndServer} from '~/platforms/node/services/node_json_rpc';
import {JamToolsEngine} from '~/core/engine/engine';
import {MidiService, QwertyService} from '~/core/types/io_types';

const WS_HOST = process.env.WS_HOST || 'ws://jam.local:1337';

export const startJamTools = async (): Promise<JamToolsEngine> => {
    const qwertyService: QwertyService = {
        onInputEvent: new Subject(),
    };

    const midiService: MidiService = {
        getInputs: () => [],
        getOutputs: () => [],
        initialize: async () => {},
        onInputEvent: new Subject(),
        send: () => {},
    };

    if (!process.env.DISABLE_IO) {
        // midiService = new NodeMidiService();
        // qwertyService = new NodeQwertyService();
    }

    const kvStore = new NodeKVStoreService('persistent');

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
