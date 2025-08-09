import { initApp } from 'springboard-server';
import type { ServerConfig, DatabaseDependencies } from 'springboard-server';
import {
    CloudflareEnvironmentProvider,
    CloudflareAssetProvider,
    CloudflareStorageProvider,
    CloudflareWebSocketProvider,
    CloudflareRpcAsyncLocalStorage,
} from '../providers';

// Cloudflare Workers environment interface
interface Env {
    KV?: {
        get: (key: string) => Promise<string | null>;
        put: (key: string, value: string) => Promise<void>;
        delete: (key: string) => Promise<void>;
    };
    ASSETS?: {
        fetch: (request: Request) => Promise<Response>;
    };
    BUCKET?: {
        get: (key: string) => Promise<{ text(): Promise<string> } | null>;
    };
    [key: string]: unknown;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            // Set up platform providers
            const environment = new CloudflareEnvironmentProvider(env);
            const assets = new CloudflareAssetProvider(env);
            const storage = new CloudflareStorageProvider(env);
            const websocket = new CloudflareWebSocketProvider(env);
            const rpcAsyncLocalStorage = new CloudflareRpcAsyncLocalStorage();
            
            // Create database dependencies (minimal for CF Workers)
            const dbDeps: DatabaseDependencies = {
                kvDatabase: null as unknown, // We use KV instead of SQL
                kvStoreFromKysely: undefined,
            };
            
            // Create server config
            const config: ServerConfig = {
                platform: {
                    environment,
                    assets,
                    storage,
                    websocket,
                    rpcAsyncLocalStorage,
                },
                options: {
                    corsEnabled: true,
                    otelEnabled: false, // OTEL might not work well in Workers
                }
            };
            
            // Initialize the app
            const { app } = initApp(config, dbDeps);
            
            // Handle the request
            return await app.fetch(request, env, ctx);
        } catch (error) {
            console.error('Worker error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    },
} satisfies ExportedHandler<Env>;