export interface EnvironmentProvider {
    /**
     * Get an environment variable value
     */
    get(key: string): string | undefined;
    
    /**
     * Get all environment variables as a record
     */
    getAll(): Record<string, string>;
}

/**
 * Default implementation that uses process.env (Node.js)
 */
export class ProcessEnvironmentProvider implements EnvironmentProvider {
    get(key: string): string | undefined {
        return process.env[key];
    }
    
    getAll(): Record<string, string> {
        return process.env as Record<string, string>;
    }
}