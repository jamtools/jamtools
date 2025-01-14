import path from 'path';

import {Hono} from 'hono';
import {serveStatic} from '@hono/node-server/serve-static';
import {createNodeWebSocket} from '@hono/node-ws';
import {trpcServer} from '@hono/trpc-server';
import {NodeJsonRpcServer} from './services/server_json_rpc';
import {WebsocketServerCoreDependencies} from './ws_server_core_dependencies';
import {ServerModuleAPI, serverRegistry} from './register';

export const initApp = (coreDeps: WebsocketServerCoreDependencies) => {
    const app = new Hono();
    const service = new NodeJsonRpcServer();

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
    };

    for (const call of registeredServerModuleCallbacks) {
        call(serverModuleAPI);
    }

    // Catch-all route for SPA
    app.use('*', serveStatic({root: webappDistFolder, path: 'index.html'}));

    return {app, injectWebSocket};
};

type ServerModuleCallback = (server: ServerModuleAPI) => void;

type CapturedRegisterServerModuleCall = ServerModuleCallback;
