/**
 * Cloudflare Workers adapter utilities for Hono applications
 */

export interface CloudflareWorkerOptions {
    /**
     * Environment bindings from Cloudflare
     */
    env?: any;
    
    /**
     * Execution context from Cloudflare Workers
     */
    ctx?: ExecutionContext;
}

/**
 * Adapter to help integrate Hono apps with Cloudflare Workers
 */
export class CloudflareHonoAdapter {
    constructor(private options: CloudflareWorkerOptions = {}) {}
    
    /**
     * Handle a request using the Hono app
     */
    async handleRequest(app: any, request: Request): Promise<Response> {
        return await app.fetch(request, this.options.env, this.options.ctx);
    }
    
    /**
     * Get environment variables
     */
    getEnv(): any {
        return this.options.env || {};
    }
    
    /**
     * Get execution context
     */
    getExecutionContext(): ExecutionContext | undefined {
        return this.options.ctx;
    }
}