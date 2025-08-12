import process from 'node:process';
import path from 'node:path';

import {serve} from '@hono/node-server';
import crosswsNode, {NodeAdapter} from 'crossws/adapters/node';

import {makeWebsocketServerCoreDependenciesWithSqlite} from '../services/ws_server_core_dependencies';

import {initApp} from 'springboard-server/src/hono_app';
import {LocalJsonNodeKVStoreService} from '../services/node_kvstore_service';
import {CoreDependencies} from 'springboard/types/module_types';
import {Springboard} from 'springboard/engine/engine';

setTimeout(async () => {
    const webappFolder = process.env.WEBAPP_FOLDER || './dist/browser';
    const webappDistFolder = path.join(webappFolder, './dist');

    const nodeKvDeps = await makeWebsocketServerCoreDependenciesWithSqlite();

    const wsNode = crosswsNode({
        hooks: {
            open: peer => {
                peer.subscribe('event');
            },
            close: peer => {
                peer.unsubscribe('event');
            },
        }
    });

    const {app, serverAppDependencies, injectResources} = initApp({
        broadcastMessage: (message) => {
            return wsNode.publish('event', message);
        },
        remoteKV: nodeKvDeps.kvStoreFromKysely,
        userAgentKV: new LocalJsonNodeKVStoreService('userAgent'),
    });

    const port = process.env.PORT || '1337';

    const server = serve({
        fetch: app.fetch,
        port: parseInt(port),
    }, (info) => {
        console.log(`Server listening on http://localhost:${info.port}`);
    });

    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        if (url.pathname === '/ws') {
            wsNode.handleUpgrade(request, socket, head);
        } else {
            socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
        }
    });

    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: console.error,
        storage: serverAppDependencies.storage,
        isMaestro: () => true,
        rpc: serverAppDependencies.rpc,
    };

    Object.assign(coreDeps, serverAppDependencies);

    const extraDeps = {}; // TODO: remove this extraDeps thing from the framework

    const engine = new Springboard(coreDeps, extraDeps);

    injectResources({
        engine,
        serveStaticFile: async (c, fileName, headers) => {
            try {
                const fullPath = `${webappDistFolder}/${fileName}`;
                const fs = await import('node:fs');
                const data = await fs.promises.readFile(fullPath, 'utf-8');
                c.status(200);

                if (headers) {
                    Object.entries(headers).forEach(([key, value]) => {
                        c.header(key, value);
                    });
                }

                return c.body(data);
            } catch (error) {
                console.error('Error serving file:', error);
                c.status(404);
                return c.text('404 Not found');
            }
        },
        getEnvValue: name => process.env[name],
    });

    await engine.initialize();

    return engine;
});

export default () => {};
