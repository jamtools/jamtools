import React from 'react';
import ReactDOM from 'react-dom/client';

import {setBasePath} from '@shoelace-style/shoelace/dist/utilities/base-path.js';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/');

import {CoreDependencies} from '~/core/types/module_types';

import {TrpcKVStoreService} from '~/core/services/trpc_kv_store_client';

import {Main} from './main';
import {BrowserQwertyService} from '~/platforms/webapp/services/browser_qwerty_service';
import {BrowserMidiService} from '~/platforms/webapp/services/browser_midi_service';
import {BrowserKVStoreService} from '~/platforms/webapp/services/browser_kvstore_service';
import {BrowserJsonRpcClientAndServer} from '~/platforms/webapp/services/browser_json_rpc';
import {JamToolsEngine} from '~/core/engine/engine';

const waitForPageLoad = () => new Promise<void>(resolve => {
    window.addEventListener('DOMContentLoaded', () => {
        resolve();
    });
});

const WS_HOST = process.env.WS_HOST || `ws://${location.host}`;
const DATA_HOST = process.env.DATA_HOST || `http://${location.host}`;

export const startJamToolsAndRenderApp = async (): Promise<JamToolsEngine> => {
    const qwertyService = new BrowserQwertyService(document);
    const midiService = new BrowserMidiService();
    const rpc = new BrowserJsonRpcClientAndServer(`${WS_HOST}/ws`);

    // const kvStore = new BrowserKVStoreService(localStorage);
    const kvStore = new TrpcKVStoreService(DATA_HOST);

    const userAgentKVStore = new BrowserKVStoreService(localStorage);

    const isLocal = localStorage.getItem('isLocal') === 'true';

    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: (error: string) => alert(error),
        inputs: {
            qwerty: qwertyService,
            midi: midiService,
        },
        storage: {
            remote: kvStore,
            userAgent: userAgentKVStore,
        },
        rpc,
        isMaestro: () => isLocal,
    };

    const engine = new JamToolsEngine(coreDeps);

    await waitForPageLoad();

    const rootElem = document.createElement('div');
    rootElem.style.overflowY = 'scroll';
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);
    root.render(<Main engine={engine} />);

    await engine.waitForInitialize();

    return engine;
};
