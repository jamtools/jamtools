# Project Requirements: Cloudflare Workers Support for Springboard

## Executive Summary

This document outlines the requirements for refactoring the springboard-server package to remove Node.js-specific dependencies and enable support for Cloudflare Workers as a deployment platform.

## Goals

1. **Remove Node.js dependencies** from springboard-server package
2. **Create platform abstractions** for cross-platform compatibility
3. **Implement Cloudflare Workers platform** package
4. **Simplify build process** by removing redundant buildServer function
5. **Maintain backward compatibility** with existing Node.js deployments

## Technical Requirements

### 1. Platform Abstraction Layer

Create interfaces in springboard-server for platform-specific functionality:

#### 1.1 Environment Provider
```typescript
interface EnvironmentProvider {
  get(key: string): string | undefined;
  getAll(): Record<string, string>;
}
```
- Replace all `process.env` usage
- Allow platforms to provide configuration differently

#### 1.2 Asset Provider
```typescript
interface AssetProvider {
  serve(path: string): Promise<Response | null>;
  exists(path: string): Promise<boolean>;
}
```
- Replace Node.js fs-based static file serving
- Support platform-specific asset delivery

#### 1.3 Storage Provider
```typescript
interface StorageProvider {
  createKVStore(name: string): KVStore;
  ensureDirectory(path: string): Promise<void>;
}
```
- Abstract away SQLite/file system dependencies
- Support KV stores for edge platforms

#### 1.4 WebSocket Provider
```typescript
interface WebSocketProvider {
  upgrade(request: Request): WebSocket | null;
  createServer(options: WebSocketServerOptions): WebSocketServer;
}
```
- Replace @hono/node-ws dependency
- Support platform-specific WebSocket implementations

### 2. Refactor springboard-server Package

#### 2.1 Files to Refactor

**src/hono_app.ts**
- Remove: `import path from 'path'`
- Remove: `import {createNodeWebSocket} from '@hono/node-ws'`
- Remove: Direct `process.env` access
- Remove: Dynamic `import('node:fs')`
- Remove: All `@springboardjs/platforms-node` imports
- Add: Dependency injection for platform providers

**src/ws_server_core_dependencies.ts**
- Remove: `import fs from 'fs'`
- Remove: Direct `process.env` access
- Replace: File-based SQLite with storage provider

**src/services/server_json_rpc.ts**
- Remove: `nodeRpcAsyncLocalStorage` import
- Add: Platform-agnostic context storage

**src/entrypoints/local-server.entrypoint.ts**
- Move entire file to `@springboardjs/platforms-node` package

#### 2.2 New Core Structure
```
springboard-server/
├── src/
│   ├── index.ts              # Main exports
│   ├── register.ts           # Module registration (unchanged)
│   ├── hono_app.ts          # Platform-agnostic Hono setup
│   ├── types/               # Interface definitions
│   │   ├── environment.ts
│   │   ├── storage.ts
│   │   ├── assets.ts
│   │   └── websocket.ts
│   └── services/
│       └── rpc_server.ts    # Generic RPC server
```

### 3. Create Cloudflare Workers Platform Package

New package: `@springboardjs/platforms-cloudflare-workers`

#### 3.1 Package Structure
```
platforms-cloudflare-workers/
├── src/
│   ├── index.ts
│   ├── providers/
│   │   ├── cf_environment.ts    # Env vars from CF bindings
│   │   ├── cf_storage.ts        # KV/Durable Objects
│   │   ├── cf_assets.ts         # Static assets
│   │   └── cf_websocket.ts      # CF WebSocket API
│   ├── entrypoints/
│   │   └── worker.ts            # CF Worker entry
│   └── adapters/
│       └── hono_adapter.ts      # Hono-to-CF adapter
├── wrangler.toml                 # CF configuration template
└── package.json
```

#### 3.2 Implementation Requirements

**Environment Provider**
- Read from Cloudflare environment bindings
- Support secrets and variables

**Storage Provider**
- Implement KVStore using Cloudflare KV
- Optional: Durable Objects support

**Asset Provider**
- Serve static files from Cloudflare Pages/Assets
- Support asset manifests

**WebSocket Provider**
- Use Cloudflare WebSocket API
- Handle connection upgrades

### 4. Update Build System

#### 4.1 Remove buildServer Function
- Delete `buildServer` from `packages/springboard/cli/src/build.ts`
- Update all references to use `buildApplication`

#### 4.2 Add Cloudflare Build Config
```typescript
export const platformCloudflareBuildConfig: BuildConfig = {
  name: 'cloudflare-workers',
  platform: 'neutral',
  platformEntrypoint: () => '@springboardjs/platforms-cloudflare-workers/entrypoints/worker.ts',
  esbuildPlugins: ({ outDir }) => [
    // Cloudflare-specific plugins
  ],
  externals: () => [
    // Cloudflare provides these
    'node:*',
  ],
};
```

### 5. Migration Strategy

#### 5.1 Phase 1: Create Abstractions
1. Define all interfaces in springboard-server
2. Create default/mock implementations
3. Ensure existing code works with abstractions

#### 5.2 Phase 2: Move Node-specific Code
1. Create Node.js provider implementations
2. Move local-server entrypoint to platforms-node
3. Update Node platform to inject providers

#### 5.3 Phase 3: Implement Cloudflare Platform
1. Create Cloudflare provider implementations
2. Build worker entrypoint
3. Test with example application

#### 5.4 Phase 4: Clean Up
1. Remove buildServer function
2. Update documentation
3. Add migration guide

### 6. Testing Requirements

#### 6.1 Unit Tests
- Test each provider interface implementation
- Mock providers for testing server modules

#### 6.2 Integration Tests
- Test full application on each platform
- Verify RPC communication works
- Test WebSocket connections

#### 6.3 Example Applications
- Create minimal example for each platform
- Include in CI/CD pipeline

### 7. Documentation Updates

- Update README with new platform
- Add Cloudflare Workers deployment guide
- Update API documentation for abstractions
- Create troubleshooting guide

## Success Criteria

1. ✅ springboard-server has zero Node.js-specific imports
2. ✅ Existing Node.js applications continue to work
3. ✅ Cloudflare Workers platform successfully builds and runs
4. ✅ All platform tests pass
5. ✅ Documentation is complete and accurate

## Timeline Estimate

- **Week 1**: Create abstraction interfaces and refactor springboard-server
- **Week 2**: Implement Node.js providers and test migration
- **Week 3**: Implement Cloudflare Workers platform
- **Week 4**: Testing, documentation, and cleanup

## Risks and Mitigations

### Risk 1: Breaking Changes
**Mitigation**: Careful testing, semantic versioning, migration guide

### Risk 2: Performance Regression
**Mitigation**: Benchmark before/after, optimize hot paths

### Risk 3: Missing Platform Features
**Mitigation**: Document platform limitations, provide workarounds

## Dependencies

- Cloudflare Workers documentation
- Wrangler CLI for testing
- Hono framework updates (if needed)

## Open Questions

1. Should we support Cloudflare Durable Objects in initial version?
2. How to handle platform-specific features (e.g., cron triggers)?
3. Should we create a platform capability matrix?
4. How to handle local development for CF Workers?