import { RpcAsyncLocalStorage } from 'springboard-server/types';

/**
 * Cloudflare Workers RPC async local storage
 * Uses a simple context store since Workers are single-threaded per request
 */
export class CloudflareRpcAsyncLocalStorage implements RpcAsyncLocalStorage {
    private currentContext: Record<string, unknown> | undefined;
    
    run<R>(context: Record<string, unknown>, fn: () => R): R {
        const previousContext = this.currentContext;
        this.currentContext = context;
        try {
            return fn();
        } finally {
            this.currentContext = previousContext;
        }
    }
    
    getStore(): Record<string, unknown> | undefined {
        return this.currentContext;
    }
}