import {serve} from '@hono/node-server';
import {makeWebsocketServerCoreDependenciesWithSqlite} from '../services/node_ws_server_core_dependencies';
import {initApp} from 'springboard-server';
import type {AppDependencies, ServerConfig} from 'springboard-server';
import {NodeAppDependencies} from './main';
import {
    NodeEnvironmentProvider,
    NodeAssetProvider, 
    NodeWebSocketProvider,
    NodeRpcAsyncLocalStorage
} from '../services/node_platform_providers';

export default async (): Promise<NodeAppDependencies> => {
    const environment = new NodeEnvironmentProvider();
    const webappFolder = environment.get('WEBAPP_FOLDER') || './dist/browser';
    const webappDistFolder = `${webappFolder}/dist`;
    
    const assets = new NodeAssetProvider(webappDistFolder);
    const websocket = new NodeWebSocketProvider();
    const rpcAsyncLocalStorage = new NodeRpcAsyncLocalStorage();
    
    const coreDeps = await makeWebsocketServerCoreDependenciesWithSqlite();
    
    const config: ServerConfig = {
        platform: {
            environment,
            assets,
            websocket,
            rpcAsyncLocalStorage,
            // TODO: Add Node storage provider
            storage: null as any
        },
        options: {
            corsEnabled: true,
            otelEnabled: true
        }
    };

    const {app, injectWebSocket, appDependencies} = initApp(config, coreDeps);

    const port = environment.get('PORT') || '1337';

    const server = serve({
        fetch: app.fetch,
        port: parseInt(port),
    }, (info) => {
        console.log(`Server listening on http://localhost:${info.port}`);
    });

    if (injectWebSocket) {
        injectWebSocket(server);
    }

    // Convert AppDependencies to NodeAppDependencies 
    const nodeAppDependencies: NodeAppDependencies = {
        rpc: appDependencies.rpc,
        storage: appDependencies.storage,
        injectEngine: appDependencies.injectEngine,
    };

    return nodeAppDependencies;
};