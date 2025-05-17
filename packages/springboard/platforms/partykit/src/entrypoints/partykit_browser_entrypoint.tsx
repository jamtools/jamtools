(globalThis as {useHashRouter?: boolean}).useHashRouter = true;

import {BrowserKVStoreService} from '@springboardjs/platforms-browser/services/browser_kvstore_service';
import {TrpcKVStoreService} from 'springboard/services/trpc_kv_store_client';
import {startAndRenderBrowserApp} from '@springboardjs/platforms-browser/entrypoints/react_entrypoint';

import {PartyKitRpcClient} from '../services/partykit_rpc_client';

let wsProtocol = 'ws';
let httpProtocol = 'http';
if (location.protocol === 'https:') {
    wsProtocol = 'wss';
    httpProtocol = 'https';
}

const partykitHost = `${location.origin}/parties/main/myroom`;
const partykitWebsocketHost = `${wsProtocol}://${location.host}`;
const partykitRoom = 'myroom';

setTimeout(() => {
    const rpc = new PartyKitRpcClient(partykitWebsocketHost, partykitRoom);
    const remoteKvStore = new TrpcKVStoreService(partykitHost);
    const userAgentKVStore = new BrowserKVStoreService(localStorage);

    startAndRenderBrowserApp({
        rpc: {
            remote: rpc,
        },
        storage: {
            userAgent: userAgentKVStore,
            remote: remoteKvStore,
        },
    });
});

export default () => { };
