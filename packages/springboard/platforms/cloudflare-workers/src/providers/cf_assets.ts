import { AssetProvider } from 'springboard-server/types';

interface CloudflareEnv {
    ASSETS?: {
        fetch: (request: Request) => Promise<Response>;
    };
    BUCKET?: {
        get: (key: string) => Promise<{ text(): Promise<string> } | null>;
    };
}

/**
 * Cloudflare Workers implementation of AssetProvider
 * Serves static assets from Cloudflare Workers Assets or R2
 */
export class CloudflareAssetProvider implements AssetProvider {
    constructor(private env: CloudflareEnv) {}
    
    async serve(path: string): Promise<Response | null> {
        try {
            // Try to fetch from Cloudflare Workers Assets
            if (this.env.ASSETS) {
                const response = await this.env.ASSETS.fetch(new Request(`https://example.com${path}`));
                if (response.ok) {
                    return response;
                }
            }
            
            // Fallback: try to get content directly
            const content = await this.getContent(path);
            if (content === null) {
                return null;
            }
            
            const headers = new Headers();
            
            // Set content type based on file extension
            if (path.endsWith('.html')) {
                headers.set('Content-Type', 'text/html');
            } else if (path.endsWith('.js')) {
                headers.set('Content-Type', 'text/javascript');
            } else if (path.endsWith('.css')) {
                headers.set('Content-Type', 'text/css');
            } else if (path.endsWith('.json')) {
                headers.set('Content-Type', 'application/json');
            }
            
            return new Response(content, { headers });
        } catch {
            return null;
        }
    }
    
    async exists(path: string): Promise<boolean> {
        try {
            const response = await this.serve(path);
            return response !== null;
        } catch {
            return false;
        }
    }
    
    async getContent(path: string): Promise<string | null> {
        try {
            // Try Workers Assets first
            if (this.env.ASSETS) {
                const response = await this.env.ASSETS.fetch(new Request(`https://example.com${path}`));
                if (response.ok) {
                    return await response.text();
                }
            }
            
            // Could also try R2 bucket if available
            if (this.env.BUCKET) {
                const object = await this.env.BUCKET.get(path.startsWith('/') ? path.slice(1) : path);
                if (object) {
                    return await object.text();
                }
            }
            
            return null;
        } catch {
            return null;
        }
    }
}