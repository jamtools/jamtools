import React from 'react';
import ReactDOM from 'react-dom/client';

import {CoreDependencies} from '~/types/module_types';

import {Main} from './main';
import {BrowserQwertyService} from './services/browser_qwerty_service';
import {BrowserKVStoreService} from './services/browser_kvstore_service';
import {BrowserMidiService} from './services/browser_midi_service';
import {BrowserJsonRpcClientAndServer} from './services/browser_json_rpc';

window.addEventListener('DOMContentLoaded', () => {
    const qwertyService = new BrowserQwertyService(document);
    const kvStore = new BrowserKVStoreService(localStorage);
    const midiService = new BrowserMidiService();
    const rpc = new BrowserJsonRpcClientAndServer('ws://localhost:8080');

    const rootElem = document.createElement('div');
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);

    const coreDeps: CoreDependencies = {
        log: console.log,
        inputs: {
            qwerty: qwertyService,
            midi: midiService,
        },
        kvStore,
        rpc,
    };

    root.render(<Main coreDeps={coreDeps} />);
});
