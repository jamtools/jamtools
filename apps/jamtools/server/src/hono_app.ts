import path from 'path';

import {Hono} from 'hono';
import {serveStatic} from '@hono/node-server/serve-static';
import {createNodeWebSocket} from '@hono/node-ws'
import {trpcServer} from '@hono/trpc-server';
import {NodeJsonRpcServer} from './services/server_json_rpc';
import {WebsocketServerCoreDependencies} from '~/platforms/ws/ws_server_core_dependencies';

export const initApp = (coreDeps: WebsocketServerCoreDependencies) => {
    const app = new Hono();
    const service = new NodeJsonRpcServer();

    const webappFolder = process.env.WEBAPP_FOLDER || '../webapp';
    const webappDistFolder = path.join(webappFolder, './dist');

    console.log(process.cwd())
    const {injectWebSocket, upgradeWebSocket} = createNodeWebSocket({app});

    app.get('/ws', upgradeWebSocket(c => service.handleHonoWebsocketConnection(c)));

    app.use('/', serveStatic({root: webappFolder, path: 'index.html'}));
    app.use('/dist/index.js', serveStatic({root: webappDistFolder, path: '/index.js'}));
    app.use('/dist/index.js.map', serveStatic({root: webappDistFolder, path: '/index.js.map'}));
    app.use('/dist/manifest.json', serveStatic({root: webappDistFolder, path: '/manifest.json'}));

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

    // Catch-all route for SPA
    app.use('*', serveStatic({root: webappFolder, path: 'index.html'}));

    return {app, injectWebSocket};
};
