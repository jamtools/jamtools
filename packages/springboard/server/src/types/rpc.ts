/**
 * Generic async local storage interface for RPC context
 */
export interface RpcAsyncLocalStorage<T = Record<string, unknown>> {
    /**
     * Run a function with the given context
     */
    run<R>(context: T, fn: () => R): R;
    
    /**
     * Get the current context
     */
    getStore(): T | undefined;
}

/**
 * Default implementation using a simple context store
 * This is not async-safe but works for single-threaded environments
 */
export class SimpleRpcAsyncLocalStorage<T = Record<string, unknown>> implements RpcAsyncLocalStorage<T> {
    private currentContext: T | undefined;
    
    run<R>(context: T, fn: () => R): R {
        const previousContext = this.currentContext;
        this.currentContext = context;
        try {
            return fn();
        } finally {
            this.currentContext = previousContext;
        }
    }
    
    getStore(): T | undefined {
        return this.currentContext;
    }
}