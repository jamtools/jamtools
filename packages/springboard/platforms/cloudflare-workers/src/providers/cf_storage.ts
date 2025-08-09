import { KVStore } from '@springboardjs/data-storage/kv_api';
import { StorageProvider } from 'springboard-server/types';

interface CloudflareKV {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string) => Promise<void>;
    delete: (key: string) => Promise<void>;
}

/**
 * Cloudflare KV Store implementation
 */
export class CloudflareKVStore implements KVStore {
    constructor(private kv: CloudflareKV, private namespace: string) {}
    
    async get(key: string): Promise<any> {
        const value = await this.kv.get(`${this.namespace}:${key}`);
        if (value === null) {
            return undefined;
        }
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    
    async set(key: string, value: any): Promise<void> {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await this.kv.put(`${this.namespace}:${key}`, serialized);
    }
    
    async delete(key: string): Promise<void> {
        await this.kv.delete(`${this.namespace}:${key}`);
    }
    
    async getAll(): Promise<any> {
        // KV doesn't have a native getAll, so we'd need to implement pagination
        // For now, return empty object
        console.warn('CloudflareKVStore.getAll() is not fully implemented due to KV API limitations');
        return {};
    }
    
    async has(key: string): Promise<boolean> {
        const value = await this.kv.get(`${this.namespace}:${key}`);
        return value !== null;
    }
}

interface CloudflareStorageEnv {
    KV?: CloudflareKV;
    [key: string]: unknown;
}

/**
 * Cloudflare Workers storage provider using KV
 */
export class CloudflareStorageProvider implements StorageProvider {
    constructor(private env: CloudflareStorageEnv) {}
    
    async createKVStore(name: string): Promise<KVStore> {
        // Use the default KV namespace from env, or create a namespaced store
        const kv = this.env.KV || this.env[`${name.toUpperCase()}_KV`] as CloudflareKV;
        if (!kv) {
            throw new Error(`KV namespace '${name}' not found in Cloudflare bindings`);
        }
        return new CloudflareKVStore(kv, name);
    }
    
    async ensureDirectory(path: string): Promise<void> {
        // No-op for Cloudflare Workers as there's no file system
    }
}