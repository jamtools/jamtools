import React from 'react';
import ReactDOM from 'react-dom/client';

import {setBasePath} from '@shoelace-style/shoelace/dist/utilities/base-path.js';

// TODO: make this not use cdn
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/');

import {CoreDependencies} from 'jamtools-core/types/module_types';

import {TrpcKVStoreService} from 'jamtools-core/services/trpc_kv_store_client';

import {Main} from './main';
import {BrowserQwertyService} from 'jamtools-platforms-webapp/services/browser_qwerty_service';
import {BrowserMidiService} from 'jamtools-platforms-webapp/services/browser_midi_service';
import {BrowserKVStoreService} from 'jamtools-platforms-webapp/services/browser_kvstore_service';
import {BrowserJsonRpcClientAndServer} from 'jamtools-platforms-webapp/services/browser_json_rpc';
import {JamToolsEngine} from 'jamtools-core/engine/engine';
import {ExtraModuleDependencies} from 'jamtools-core/module_registry/module_registry';
// import {UltimateGuitarService} from '~/features/modules/ultimate_guitar/ultimate_guitar_service';

const waitForPageLoad = () => new Promise<void>(resolve => {
    window.addEventListener('DOMContentLoaded', () => {
        resolve();
    });
});

let wsProtocol = 'ws';
let httpProtocol = 'http';
if (location.protocol === 'https:') {
    wsProtocol = 'wss';
    httpProtocol = 'https';
}

const WS_HOST = process.env.WS_HOST || `${wsProtocol}://${location.host}`;
const DATA_HOST = process.env.DATA_HOST || `${httpProtocol}://${location.host}`;

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
        files: {
            saveFile: async () => {},
        },
        rpc,
        isMaestro: () => isLocal,
    };

    const extraDeps: ExtraModuleDependencies = {
        // Ultimate_Guitar: {
        //     domParser: (htmlData: string) => new DOMParser().parseFromString(htmlData, 'text/html'),
        //     ultimateGuitarService: createNotImplementedProxy(new UltimateGuitarService()),
        // },
    };

    const engine = new JamToolsEngine(coreDeps, extraDeps);

    await waitForPageLoad();

    const rootElem = document.createElement('div');
    rootElem.style.overflowY = 'scroll';
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);
    root.render(<Main engine={engine} />);

    await engine.waitForInitialize();

    return engine;
};

const createNotImplementedProxy = <ToMock extends object,>(toMock: ToMock) => {
    return new Proxy(toMock, {
        get(target, prop) {
            return () => {
                throw new Error(`${prop.toString()} is not implemented in this environment.`);
            };
        }
    });
};
