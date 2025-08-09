import { EnvironmentProvider } from 'springboard-server/types';

/**
 * Cloudflare Workers implementation of EnvironmentProvider
 * Gets environment variables from Cloudflare bindings
 */
export class CloudflareEnvironmentProvider implements EnvironmentProvider {
    constructor(private env: Record<string, unknown>) {}
    
    get(key: string): string | undefined {
        const value = this.env[key];
        return typeof value === 'string' ? value : undefined;
    }
    
    getAll(): Record<string, string> {
        // Return a copy of all environment variables
        const result: Record<string, string> = {};
        for (const key in this.env) {
            if (typeof this.env[key] === 'string') {
                result[key] = this.env[key] as string;
            }
        }
        return result;
    }
}