import React from 'react';
import ReactDOM from 'react-dom/client';

import {CoreDependencies} from 'springboard/types/module_types';

import {TrpcKVStoreService} from 'springboard/services/trpc_kv_store_client';

import {Main} from './main';
import {BrowserKVStoreService} from '@springboardjs/platforms-browser/services/browser_kvstore_service';
import {BrowserJsonRpcClientAndServer} from '@springboardjs/platforms-browser/services/browser_json_rpc';
import {Springboard} from 'springboard/engine/engine';
import {ExtraModuleDependencies} from 'springboard/module_registry/module_registry';

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

export const startAndRenderBrowserApp = async (): Promise<Springboard> => {
    const rpc = new BrowserJsonRpcClientAndServer(`${WS_HOST}/ws`);

    // const kvStore = new BrowserKVStoreService(localStorage);
    const kvStore = new TrpcKVStoreService(DATA_HOST);

    const userAgentKVStore = new BrowserKVStoreService(localStorage);

    const isLocal = localStorage.getItem('isLocal') === 'true';

    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: (error: string) => alert(error),
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
    };

    const engine = new Springboard(coreDeps, extraDeps);

    await waitForPageLoad();

    const rootElem = document.createElement('div');
    // rootElem.style.overflowY = 'scroll';
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
