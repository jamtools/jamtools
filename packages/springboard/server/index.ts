import {serverRegistry} from './src/register';

export default serverRegistry;

// Export new platform-agnostic interfaces and functions
export { initApp } from './src/hono_app';
export type { AppDependencies } from './src/hono_app';
export * from './src/types';
export { GenericJsonRpcServer } from './src/services/server_json_rpc';
