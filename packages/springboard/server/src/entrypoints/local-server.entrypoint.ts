import {serve} from '@hono/node-server';
import crosswsNode from 'crossws/adapters/node';
import crosswsCf from 'crossws/adapters/cloudflare';

import {makeWebsocketServerCoreDependenciesWithSqlite} from '@springboardjs/platforms-node/services/ws_server_core_dependencies';

import {initApp} from '../hono_app';
import {ServerAppDependencies} from '@/types/server_app_dependencies';

export default async (): Promise<ServerAppDependencies> => {
    const coreDeps = await makeWebsocketServerCoreDependenciesWithSqlite();

    const {app, serverAppDependencies, websocketHooks} = initApp(coreDeps);

    const port = process.env.PORT || '1337';

    // Create crossws adapter with the hooks
    const wsNode = crosswsNode({ hooks: websocketHooks });
    const wsCf = crosswsCf({ hooks: websocketHooks });

    const server = serve({
        fetch: app.fetch,
        port: parseInt(port),
    }, (info) => {
        console.log(`Server listening on http://localhost:${info.port}`);
    });

    // Attach crossws WebSocket upgrade handler to the server, only for /ws route
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        if (url.pathname === '/ws') {
            wsNode.handleUpgrade(request, socket, head);
        } else {
            socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
        }
    });

    return serverAppDependencies;
};
