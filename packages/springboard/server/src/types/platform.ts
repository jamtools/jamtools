import { EnvironmentProvider } from './environment';
import { AssetProvider } from './assets';
import { StorageProvider, DatabaseDependencies } from './storage';
import { WebSocketProvider } from './websocket';
import { RpcAsyncLocalStorage } from './rpc';

/**
 * Platform-specific dependencies that need to be injected into the server
 */
export interface PlatformDependencies {
    environment: EnvironmentProvider;
    assets: AssetProvider;
    storage: StorageProvider;
    websocket: WebSocketProvider;
    rpcAsyncLocalStorage?: RpcAsyncLocalStorage;
    database?: DatabaseDependencies;
}

/**
 * Configuration for initializing the server app
 */
export interface ServerConfig {
    /**
     * Platform-specific dependencies
     */
    platform: PlatformDependencies;
    
    /**
     * Optional server-specific options
     */
    options?: {
        corsEnabled?: boolean;
        otelEnabled?: boolean;
    };
}