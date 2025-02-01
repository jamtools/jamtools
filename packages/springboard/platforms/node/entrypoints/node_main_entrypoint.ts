import {TrpcKVStoreService} from 'springboard/services/trpc_kv_store_client';
import {startNodeApp} from './main';

import {NodeKVStoreService} from '../services/node_kvstore_service';
import {NodeJsonRpcClientAndServer} from '../services/node_json_rpc';

const port = process.env.PORT || 1337;
const DATA_HOST = process.env.DATA_HOST || `http://localhost:${port}`;
const WS_HOST = process.env.WS_HOST || `ws://localhost:${port}`;

const sessionStore = new NodeKVStoreService('session');

const rpc = new NodeJsonRpcClientAndServer(`${WS_HOST}/ws?is_maestro=true`, sessionStore);

const kvStore = new TrpcKVStoreService(DATA_HOST);

startNodeApp({
    rpc,
    storage: {
        remote: kvStore,
        userAgent: sessionStore,
    },
}).then(async engine => {
    await new Promise(() => {});
});

export default () => {

};
