(globalThis as {useHashRouter?: boolean}).useHashRouter = true;

const alertErrors = false;

window.onerror = function (message, sourcefile, lineno, colno, error) {
    if (message.toString().includes('ResizeObserver')) {
        return true;
    }

    if (alertErrors) {
        alert('Alerting onerror: ' + message + ' - Source: ' + sourcefile + ' Line: ' + lineno + ':' + colno);
    }
    return true;
};

const originalConsoleError = console.error.bind(console);

console.error = function (message, ...args) {
    if (alertErrors) {
        alert('Message: ' + message);
    }

    originalConsoleError(message, ...args);

    return true;
};

import React from 'react';
import ReactDOM from 'react-dom/client';

import {CoreDependencies, KVStore, Rpc} from 'springboard/types/module_types';

import {Main} from '@springboardjs/platforms-browser/entrypoints/main';
import {Springboard} from 'springboard/engine/engine';

import {RpcWebviewToRN} from '../services/rpc/rpc_webview_to_rn';
import {WebviewToReactNativeKVService} from '../services/kv/kv_rn_and_webview';
import {BrowserJsonRpcClientAndServer} from '@springboardjs/platforms-browser/services/browser_json_rpc';
import {TrpcKVStoreService} from 'springboard/services/trpc_kv_store_client';
import {ReactNativeWebviewLocalTokenService} from '../services/rn_webview_local_token_service';

export const startJamToolsAndRenderApp = async (args: {remoteUrl: string}): Promise<Springboard> => {
    const DATA_HOST = args.remoteUrl;
    const WS_HOST = DATA_HOST.replace('http', 'ws');

    let WS_FULL_URL = WS_HOST + '/ws';
    const tokenService = new ReactNativeWebviewLocalTokenService();
    const queryParams = tokenService.makeQueryParams();
    if (queryParams) {
        WS_FULL_URL += `?${queryParams.toString()}`;
    }

    const remoteRpc = new BrowserJsonRpcClientAndServer(WS_FULL_URL);
    const remoteKv = new TrpcKVStoreService(DATA_HOST);

    const postMessage = (message: string) => (window as any).ReactNativeWebView.postMessage(message);

    const engine = createRNWebviewEngine({remoteRpc, remoteKv, onMessageFromWebview: postMessage});

    const rootElem = document.createElement('div');
    // rootElem.style.overflowY = 'scroll';
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);
    root.render(<Main engine={engine} />);

    await engine.waitForInitialize();

    return engine;
};

export const createRNWebviewEngine = (props: {remoteRpc: Rpc, remoteKv: KVStore, onMessageFromWebview: (message: string) => void}) => {
    const remoteRpc = props.remoteRpc;
    const localRpc = new RpcWebviewToRN({postMessage: props.onMessageFromWebview});

    const remoteKVStore = props.remoteKv;
    const userAgentKVStore = new WebviewToReactNativeKVService({rpc: localRpc, prefix: 'userAgent'});

    const isLocal = localStorage.getItem('isLocal') === 'true';

    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: (error: string) => console.error(error),
        storage: {
            remote: remoteKVStore,
            userAgent: userAgentKVStore,
        },
        files: {
            saveFile: async () => { },
        },
        rpc: {
            remote: remoteRpc,
            local: localRpc,
        },
        isMaestro: () => isLocal,
    };

    const engine = new Springboard(coreDeps, {});
    return engine;
};

// setTimeout(startJamToolsAndRenderApp);

// export default () => {};
