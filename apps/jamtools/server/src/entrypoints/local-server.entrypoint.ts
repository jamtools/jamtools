import {serve} from '@hono/node-server';

import {makeWebsocketServerCoreDependenciesWithSqlite} from '~/platforms/ws/ws_server_core_dependencies';

import {initApp} from '../hono_app';

setTimeout(async () => {
    const coreDeps = await makeWebsocketServerCoreDependenciesWithSqlite();

    const {app, injectWebSocket} = initApp(coreDeps);

    const port = process.env.PORT || '1337';

    const server = serve({
        fetch: app.fetch,
        port: parseInt(port),
    }, (info) => {
        console.log(`Server listening on http://localhost:${info.port}`);
    });

    injectWebSocket(server);
});
