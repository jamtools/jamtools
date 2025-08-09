import { KVStore } from '@springboardjs/data-storage/kv_api';

export interface StorageProvider {
    /**
     * Create a KV store with the given name
     */
    createKVStore(name: string): Promise<KVStore>;
    
    /**
     * Ensure a directory exists (no-op for platforms without file systems)
     */
    ensureDirectory(path: string): Promise<void>;
}

/**
 * Database dependencies for platforms that need them
 */
export interface DatabaseDependencies {
    kvDatabase: unknown; // Platform-specific database instance
    kvStoreFromKysely?: unknown; // Optional KVStoreFromKysely instance
}