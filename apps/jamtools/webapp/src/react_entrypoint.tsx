import React from 'react';
import ReactDOM from 'react-dom/client';

import {CoreDependencies} from '~/core/types/module_types';

import {Main} from './main';
import {BrowserQwertyService} from '~/platforms/webapp/services/browser_qwerty_service';
import {BrowserKVStoreService} from '~/platforms/webapp/services/browser_kvstore_service';
import {BrowserMidiService} from '~/platforms/webapp/services/browser_midi_service';
import {BrowserJsonRpcClientAndServer} from '~/platforms/webapp/services/browser_json_rpc';
import {JamToolsEngine} from '~/core/engine/engine';

const waitForPageLoad = () => new Promise<void>(resolve => {
    window.addEventListener('DOMContentLoaded', () => {
        resolve();
    });
});

export const startJamToolsAndRenderApp = async (): Promise<JamToolsEngine> => {
    const qwertyService = new BrowserQwertyService(document);
    const kvStore = new BrowserKVStoreService(localStorage);
    const midiService = new BrowserMidiService();
    const rpc = new BrowserJsonRpcClientAndServer('ws://localhost:8080');

    const coreDeps: CoreDependencies = {
        log: console.log,
        inputs: {
            qwerty: qwertyService,
            midi: midiService,
        },
        kvStore,
        rpc,
    };

    const engine = new JamToolsEngine(coreDeps);

    await waitForPageLoad();

    const rootElem = document.createElement('div');
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);
    root.render(<Main engine={engine} />);

    await engine.waitForInitialize();

    return engine;
};
