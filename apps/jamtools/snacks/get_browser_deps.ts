import {CoreDependencies} from '~/types/module_types';
import {BrowserJsonRpcClientAndServer} from '../webapp/src/services/browser_json_rpc';
import {BrowserMidiService} from '../webapp/src/services/browser_midi_service';
import {BrowserKVStoreService} from '../webapp/src/services/browser_kvstore_service';
import {BrowserQwertyService} from '../webapp/src/services/browser_qwerty_service';

export const getBrowserDeps = (): CoreDependencies => {
    const qwertyService = new BrowserQwertyService(document);
    const kvStore = new BrowserKVStoreService(localStorage);
    const midiService = new BrowserMidiService();
    const rpc = new BrowserJsonRpcClientAndServer('ws://localhost:8080')

    const coreDeps: CoreDependencies = {
        log: console.log,
        inputs: {
            qwerty: qwertyService,
            midi: midiService,
        },
        kvStore,
        rpc,
    };

    return coreDeps;
};
