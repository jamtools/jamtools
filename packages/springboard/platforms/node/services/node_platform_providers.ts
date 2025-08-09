import { createNodeWebSocket } from '@hono/node-ws';
import { Hono, Context } from 'hono';
import { WSEvents } from 'hono/ws';
import { 
    EnvironmentProvider, 
    AssetProvider, 
    WebSocketProvider,
    FileSystemAssetProvider,
    RpcAsyncLocalStorage
} from 'springboard-server/types';
import { nodeRpcAsyncLocalStorage } from './node_rpc_async_local_storage';

/**
 * Node.js implementation of EnvironmentProvider
 */
export class NodeEnvironmentProvider implements EnvironmentProvider {
    get(key: string): string | undefined {
        return process.env[key];
    }
    
    getAll(): Record<string, string> {
        return process.env as Record<string, string>;
    }
}

/**
 * Node.js implementation of WebSocketProvider
 */
export class NodeWebSocketProvider implements WebSocketProvider {
    createWebSocketHandler(app: Hono) {
        const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
        return { upgradeWebSocket, injectWebSocket };
    }
}

/**
 * Node.js asset provider using file system
 */
export class NodeAssetProvider extends FileSystemAssetProvider {
    constructor(rootPath: string) {
        super(rootPath);
    }
}

/**
 * Node.js RPC async local storage
 */
export class NodeRpcAsyncLocalStorage implements RpcAsyncLocalStorage {
    run<R>(context: Record<string, unknown>, fn: () => R): R {
        return nodeRpcAsyncLocalStorage.run(context, fn);
    }
    
    getStore(): Record<string, unknown> | undefined {
        return nodeRpcAsyncLocalStorage.getStore();
    }
}