import path from 'path';

import {Context, Hono} from 'hono';
// import {serveStatic} from '@hono/node-server/serve-static';
import {serveStatic} from 'hono/serve-static';
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

    const rpc = new NodeLocalJsonRpcClientAndServer({
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

    // this is necessary because https://github.com/honojs/hono/issues/3483
    // node-server serveStatic is missing absolute path support
    const serveFile = async (path: string, contentType: string, c: Context) => {
        try {
            const fullPath = `${webappDistFolder}/${path}`;
            const fs = await import('node:fs');
            const data = await fs.promises.readFile(fullPath, 'utf-8');
            c.header('Content-Type', contentType);
            c.status(200);
            return data;
        } catch (error) {
            console.error('Error serving fallback file:', error);
            c.status(404);
            return '404 Not Found';
        }
    };

    app.use('/', serveStatic({
        root: webappDistFolder,
        path: 'index.html',
        getContent: async (path, c) => {
            return serveFile('index.html', 'text/html', c);
        }
    }));
    app.use('/dist/index.js', serveStatic({
        root: webappDistFolder,
        path: '/index.js',
        getContent: async (path, c) => {
            return serveFile('index.js', 'application/javascript', c);
        }
    }));
    app.use('/dist/index.css', serveStatic({
        root: webappDistFolder,
        path: '/index.css',
        getContent: async (path, c) => {
            return serveFile('index.css', 'text/css', c);
        }
    }));
    app.use('/dist/manifest.json', serveStatic({
        root: webappDistFolder,
        path: '/manifest.json',
        getContent: async (path, c) => {
            return serveFile('manifest.json', 'application/json', c);
        }
    }));

    if (process.env.NODE_ENV !== 'production') {
        app.use('/dist/index.js.map', serveStatic({
            root: webappDistFolder,
            path: '/index.js.map',
            getContent: async (path, c) => {
                return serveFile('index.js.map', 'application/javascript', c);
            }
        }));
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
    app.use('*', serveStatic({
        root: webappDistFolder,
        path: 'index.html',
        getContent: async (path, c) => {
            return serveFile('index.html', 'text/html', c);
        }
    }));

    return {app, injectWebSocket, nodeAppDependencies};
};

type ServerModuleCallback = (server: ServerModuleAPI) => void;

type CapturedRegisterServerModuleCall = ServerModuleCallback;
