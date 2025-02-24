import {BrowserJsonRpcClientAndServer} from '../services/browser_json_rpc';
import {BrowserKVStoreService} from '../services/browser_kvstore_service';
import {TrpcKVStoreService} from 'springboard/services/trpc_kv_store_client';
import {startAndRenderBrowserApp} from './react_entrypoint';

let wsProtocol = 'ws';
let httpProtocol = 'http';
if (location.protocol === 'https:') {
    wsProtocol = 'wss';
    httpProtocol = 'https';
}

const WS_HOST = process.env.WS_HOST || `${wsProtocol}://${location.host}`;
const DATA_HOST = process.env.DATA_HOST || `${httpProtocol}://${location.host}`;

setTimeout(() => {
    const rpc = new BrowserJsonRpcClientAndServer(`${WS_HOST}/ws`);
    const remoteKvStore = new TrpcKVStoreService(DATA_HOST);
    const userAgentKVStore = new BrowserKVStoreService(localStorage);


    startAndRenderBrowserApp({
        rpc,
        storage: {
            userAgent: userAgentKVStore,
            remote: remoteKvStore,
        },
    });
});

export default () => { };
