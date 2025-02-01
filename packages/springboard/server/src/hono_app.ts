import path from 'path';

import {Hono} from 'hono';
import {serveStatic} from '@hono/node-server/serve-static';
import {createNodeWebSocket} from '@hono/node-ws';
import {cors} from 'hono/cors';
import {trpcServer} from '@hono/trpc-server';

import {NodeAppDependencies} from '@springboardjs/platforms-node/entrypoints/main';
import {KVStoreFromKysely} from '@springboardjs/data-storage/kv_api_kysely';
import {NodeKVStoreService} from '@springboardjs/platforms-node/services/node_kvstore_service';
import {NodeLocalJsonRpcClientAndServer} from '@springboardjs/platforms-node/services/node_local_json_rpc';

import {NodeJsonRpcServer} from './services/server_json_rpc';
import {WebsocketServerCoreDependencies} from './ws_server_core_dependencies';
import {RpcMiddleware, ServerModuleAPI, serverRegistry} from './register';

type InitAppReturnValue = {
    app: Hono;
    injectWebSocket: ReturnType<typeof createNodeWebSocket>['injectWebSocket'];
    nodeAppDependencies: NodeAppDependencies;
};

export const initApp = (coreDeps: WebsocketServerCoreDependencies): InitAppReturnValue => {
    let rpc: NodeLocalJsonRpcClientAndServer | undefined;
    const rpcMiddlewares: RpcMiddleware[] = [];

    const app = new Hono();

    app.use('*', cors());

    const service = new NodeJsonRpcServer({
        processRequest: async (message) => {
            return rpc!.processRequest(message);
        },
        rpcMiddlewares,
    });

    const remoteKV = new KVStoreFromKysely(coreDeps.kvDatabase);
    const userAgentStore = new NodeKVStoreService('userAgent');

    rpc = new NodeLocalJsonRpcClientAndServer({
        broadcastMessage: (message) => {
            return service.broadcastMessage(message);
        },
    });

    const nodeAppDependencies: NodeAppDependencies = {
        rpc,
        storage: {
            remote: remoteKV,
            userAgent: userAgentStore,
        },
    };

    const webappFolder = process.env.WEBAPP_FOLDER || './dist/browser';
    const webappDistFolder = path.join(webappFolder, './dist');

    const {injectWebSocket, upgradeWebSocket} = createNodeWebSocket({app});

    app.get('/ws', upgradeWebSocket(c => service.handleConnection(c)));

    app.use('/', serveStatic({root: webappDistFolder, path: 'index.html'}));
    app.use('/dist/index.js', serveStatic({root: webappDistFolder, path: '/index.js'}));
    app.use('/dist/index.css', serveStatic({root: webappDistFolder, path: '/index.css'}));
    app.use('/dist/manifest.json', serveStatic({root: webappDistFolder, path: '/manifest.json'}));

    if (process.env.NODE_ENV !== 'production') {
        app.use('/dist/index.js.map', serveStatic({root: webappDistFolder, path: '/index.js.map'}));
    }

    // OTEL traces route
    app.post('/v1/traces', async (c) => {
        const otelHost = process.env.OTEL_HOST;
        if (!otelHost) return c.json({message: 'No OTEL host set up via env var'});

        try {
            const response = await fetch(`${otelHost}/v1/traces`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(await c.req.json()),
                signal: AbortSignal.timeout(1000),
            });
            return c.text(await response.text());
        } catch {
            return c.json({message: 'Failed to contact OTEL host'});
        }
    });

    app.use('/trpc/*', trpcServer({
        router: coreDeps.kvTrpcRouter,
        createContext: ({req}) => ({ /* Add context if needed */}),
    }));

    const registerServerModule: typeof serverRegistry['registerServerModule'] = (cb) => {
        cb(serverModuleAPI);
    };

    const registeredServerModuleCallbacks = (serverRegistry.registerServerModule as unknown as {calls: CapturedRegisterServerModuleCall[]}).calls || [];
    serverRegistry.registerServerModule = registerServerModule;

    const serverModuleAPI: ServerModuleAPI = {
        hono: app,
        hooks: {
            registerRpcMiddleware: (cb) => {
                rpcMiddlewares.push(cb);
            },
        },
    };

    for (const call of registeredServerModuleCallbacks) {
        call(serverModuleAPI);
    }

    // Catch-all route for SPA
    app.use('*', serveStatic({root: webappDistFolder, path: 'index.html'}));

    return {app, injectWebSocket, nodeAppDependencies};
};

type ServerModuleCallback = (server: ServerModuleAPI) => void;

type CapturedRegisterServerModuleCall = ServerModuleCallback;
