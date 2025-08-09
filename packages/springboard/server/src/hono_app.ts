import {Context, Hono} from 'hono';
import {serveStatic} from 'hono/serve-static';
import {cors} from 'hono/cors';

import {KVStoreFromKysely} from '@springboardjs/data-storage/kv_api_kysely';
// TODO: These should be made platform-agnostic
import {NodeKVStoreService} from '@springboardjs/platforms-node/services/node_kvstore_service';
import {NodeLocalJsonRpcClientAndServer} from '@springboardjs/platforms-node/services/node_local_json_rpc';

import {GenericJsonRpcServer} from './services/server_json_rpc';
import {RpcMiddleware, ServerModuleAPI, serverRegistry} from './register';
import {Springboard} from 'springboard/engine/engine';
import {ServerConfig, DatabaseDependencies, SimpleRpcAsyncLocalStorage} from './types';

// Platform-agnostic app dependencies
export interface AppDependencies {
    rpc: {
        remote: NodeLocalJsonRpcClientAndServer; // TODO: Make platform-agnostic
        local: NodeLocalJsonRpcClientAndServer | undefined;
    };
    storage: {
        remote: KVStoreFromKysely;
        userAgent: NodeKVStoreService; // TODO: Make platform-agnostic
    };
    injectEngine: (engine: Springboard) => void;
}

type InitAppReturnValue = {
    app: Hono;
    injectWebSocket?: (server: unknown) => void;
    appDependencies: AppDependencies;
};

export const initApp = (config: ServerConfig, dbDeps: DatabaseDependencies): InitAppReturnValue => {
    const rpcMiddlewares: RpcMiddleware[] = [];

    const app = new Hono();

    app.use('*', cors());

    const service: GenericJsonRpcServer = new GenericJsonRpcServer({
        processRequest: async (message) => {
            return rpc!.processRequest(message);
        },
        rpcMiddlewares,
        rpcAsyncLocalStorage: config.platform.rpcAsyncLocalStorage || new SimpleRpcAsyncLocalStorage(),
    });

    const remoteKV = new KVStoreFromKysely(dbDeps.kvDatabase as ConstructorParameters<typeof KVStoreFromKysely>[0]);
    const userAgentStore = new NodeKVStoreService('userAgent'); // TODO: Make this platform-agnostic

    const rpc = new NodeLocalJsonRpcClientAndServer({
        broadcastMessage: (message) => {
            return service.broadcastMessage(message);
        },
    });

    const webappFolder = config.platform.environment.get('WEBAPP_FOLDER') || './dist/browser';
    const webappDistFolder = `${webappFolder}/dist`;

    const wsHandler = config.platform.websocket.createWebSocketHandler(app);
    const {upgradeWebSocket, injectWebSocket} = wsHandler;

    app.get('/ws', upgradeWebSocket(c => service.handleConnection(c)));

    app.get('/kv/get', async (c) => {
        const key = c.req.param('key');

        if (!key) {
            return c.json({error: 'No key provided'}, 400);
        }

        const value = await remoteKV.get(key);

        return c.json(value || null);
    });

    app.post('/kv/set', async (c) => {
        const body = await c.req.text();
        const {key, value} = JSON.parse(body);

        c.header('Content-Type', 'application/json');

        if (!key) {
            return c.json({error: 'No key provided'}, 400);
        }

        if (!value) {
            return c.json({error: 'No value provided'}, 400);
        }

        await remoteKV.set(key, value);
        return c.json({success: true});
    });

    app.get('/kv/get-all', async (c) => {
        const all = await remoteKV.getAll();
        return c.json(all);
    });

    app.post('/rpc/*', async (c) => {
        const body = await c.req.text();
        c.header('Content-Type', 'application/json');

        const rpcResponse = await service.processRequestWithMiddleware(c, body);
        if (rpcResponse) {
            return c.text(rpcResponse);
        }

        return c.text(JSON.stringify({
            error: 'No response',
        }), 500);
    });

    // Platform-agnostic file serving
    const serveFile = async (path: string, contentType: string, c: Context) => {
        try {
            const content = await config.platform.assets.getContent(path);
            if (content === null) {
                c.status(404);
                return '404 Not Found';
            }
            c.status(200);
            c.header('Content-Type', contentType);
            return content;
        } catch (error) {
            console.error('Error serving file:', error);
            c.status(404);
            return '404 Not Found';
        }
    };

    app.use('/', serveStatic({
        root: webappDistFolder,
        path: 'index.html',
        getContent: async (_, c) => {
            return serveFile('index.html', 'text/html', c);
        },
        onFound: (_, c) => {
            // c.header('Cross-Origin-Embedder-Policy',  'require-corp');
            // c.header('Cross-Origin-Opener-Policy',  'same-origin');
            c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
            c.header('Pragma', 'no-cache');
            c.header('Expires', '0');
        },
    }));

    app.use('/dist/:file', async (c, next) => {
        const requestedFile = c.req.param('file');

        if (requestedFile.endsWith('.map') && config.platform.environment.get('NODE_ENV') === 'production') {
            return c.text('Source map disabled', 404);
        }

        const contentType = requestedFile.endsWith('.js') ? 'text/javascript' : 'text/css';
        return serveStatic({
            root: webappDistFolder,
            path: `/${requestedFile}`,
            getContent: async (_, c) => {
                return serveFile(requestedFile, contentType, c);
            },
            onFound: (_, c) => {
                c.header('Content-Type', contentType);
                c.header('Cache-Control', 'public, max-age=31536000, immutable');
            },
        })(c, next);
    });

    // app.use('/dist/manifest.json', serveStatic({
    //     root: webappDistFolder,
    //     path: '/manifest.json',
    //     getContent: async (path, c) => {
    //         return serveFile('manifest.json', 'application/json', c);
    //     }
    // }));

    // OTEL traces route (optional)
    if (config.options?.otelEnabled !== false) {
        app.post('/v1/traces', async (c) => {
            const otelHost = config.platform.environment.get('OTEL_HOST');
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
    }

    let storedEngine: Springboard | undefined;

    const appDependencies: AppDependencies = {
        rpc: {
            remote: rpc,
            local: undefined,
        },
        storage: {
            remote: remoteKV,
            userAgent: userAgentStore,
        },
        injectEngine: (engine: Springboard) => {
            if (storedEngine) {
                throw new Error('Engine already injected');
            }

            storedEngine = engine;
        },
    };

    const makeServerModuleAPI = (): ServerModuleAPI => {
        return {
            hono: app,
            hooks: {
                registerRpcMiddleware: (cb) => {
                    rpcMiddlewares.push(cb);
                },
            },
            getEngine: () => storedEngine!,
        };
    };

    const registerServerModule: typeof serverRegistry['registerServerModule'] = (cb) => {
        cb(makeServerModuleAPI());
    };

    const registeredServerModuleCallbacks = (serverRegistry.registerServerModule as unknown as {calls: CapturedRegisterServerModuleCall[]}).calls || [];
    serverRegistry.registerServerModule = registerServerModule;

    for (const call of registeredServerModuleCallbacks) {
        call(makeServerModuleAPI());
    }

    // Catch-all route for SPA
    app.use('*', serveStatic({
        root: webappDistFolder,
        path: 'index.html',
        getContent: async (_, c) => {
            return serveFile('index.html', 'text/html', c);
        },
        onFound: (_, c) => {
            // c.header('Cross-Origin-Embedder-Policy',  'require-corp');
            // c.header('Cross-Origin-Opener-Policy',  'same-origin');
            c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
            c.header('Pragma', 'no-cache');
            c.header('Expires', '0');
        },
    }));

    return {app, injectWebSocket, appDependencies};
};

type ServerModuleCallback = (server: ServerModuleAPI) => void;

type CapturedRegisterServerModuleCall = ServerModuleCallback;
