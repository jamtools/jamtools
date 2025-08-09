export interface AssetProvider {
    /**
     * Serve a static asset at the given path
     * Returns Response if asset exists, null if not found
     */
    serve(path: string): Promise<Response | null>;
    
    /**
     * Check if an asset exists at the given path
     */
    exists(path: string): Promise<boolean>;
    
    /**
     * Get the content of an asset as text
     */
    getContent(path: string): Promise<string | null>;
}

/**
 * Default implementation that uses Node.js file system
 */
export class FileSystemAssetProvider implements AssetProvider {
    constructor(private rootPath: string) {}
    
    async serve(path: string): Promise<Response | null> {
        try {
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
            const fs = await import('node:fs');
            const fullPath = this.getFullPath(path);
            await fs.promises.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }
    
    async getContent(path: string): Promise<string | null> {
        try {
            const fs = await import('node:fs');
            const fullPath = this.getFullPath(path);
            return await fs.promises.readFile(fullPath, 'utf-8');
        } catch {
            return null;
        }
    }
    
    private getFullPath(path: string): string {
        const pathModule = require('path');
        return pathModule.join(this.rootPath, path);
    }
}