# Task Journal: Refactoring springboard-server for Platform Agnosticism

## Objective
Remove node-specific code from springboard-server to enable cloudflare-workers platform support.

## Overview
Analyzing how PartyKit handles server concerns without node dependencies to understand patterns for making springboard-server more generic and platform-agnostic.

## Key Findings

### `/packages/springboard/platforms/partykit/package.json`
- Uses PartyKit as the runtime environment
- Still has dependencies on `@springboardjs/platforms-node` but uses it selectively
- Depends on `springboard-server` as a workspace dependency
- Uses Hono for HTTP server functionality (platform-agnostic)

### `/packages/springboard/platforms/partykit/src/partykit_hono_app.ts`
- **Key Pattern**: Creates a Hono app without Node-specific imports (except for mock dependencies)
- Uses PartyKit's `Room` abstraction for state management instead of file system
- Implements its own RPC server (`PartykitJsonRpcServer`) that works with PartyKit's connection model
- Uses `PartykitKVStore` that wraps PartyKit's storage API instead of SQLite
- **Important**: Still imports from `@springboardjs/platforms-node` but only for type definitions and interfaces
- Demonstrates how to inject platform-specific implementations while keeping the API consistent

### `/packages/springboard/platforms/partykit/src/entrypoints/partykit_server_entrypoint.ts`
- Implements PartyKit's `Party.Server` interface
- **No Node.js imports** - uses PartyKit's APIs for everything
- Handles WebSocket connections through PartyKit's `onMessage` method
- Uses PartyKit's storage API (`room.storage`) instead of file system
- Serves static assets through PartyKit's asset system (`room.context.assets.fetch`)
- **Key Pattern**: Environment-specific entrypoint that adapts the generic app to the platform

### `/packages/springboard/platforms/partykit/src/services/partykit_kv_store.ts`
- Implements the generic `KVStore` interface using PartyKit's storage
- **Pattern**: Platform-specific implementation of a generic interface
- No file system or Node.js dependencies
- Uses PartyKit's `Room.storage` API for persistence

### `/packages/springboard/platforms/partykit/src/services/partykit_rpc_server.ts`
- Adapts RPC handling to PartyKit's connection model
- Uses PartyKit's `Connection` and `Room` types instead of Node.js WebSocket
- **Pattern**: Platform-specific WebSocket/connection handling

### `/packages/springboard/platforms/partykit/src/services/partykit_rpc_client.ts`
- Client-side RPC implementation using PartySocket (PartyKit's client library)
- Works in browser environment
- No Node.js dependencies

## Node-Specific Code in springboard-server

### `/packages/springboard/server/src/hono_app.ts`
**Node-specific imports and usage:**
- `import path from 'path'` - Node.js path module
- `import {createNodeWebSocket} from '@hono/node-ws'` - Node-specific WebSocket
- `import {serveStatic} from 'hono/serve-static'` - Uses Node.js file system
- `process.env.WEBAPP_FOLDER` - Node.js process.env
- `const fs = await import('node:fs')` - Dynamic import of Node.js fs module
- `process.env.OTEL_HOST` - Environment variable access
- `process.env.NODE_ENV` - Node environment check

**Abstractions needed:**
1. File serving abstraction (replace fs.promises.readFile)
2. Environment variable abstraction
3. WebSocket abstraction
4. Path handling abstraction

### `/packages/springboard/server/src/services/server_json_rpc.ts`
- Uses `WSContext` from Hono which is relatively generic
- Imports `nodeRpcAsyncLocalStorage` from Node platform
- Otherwise relatively platform-agnostic

### `/packages/springboard/server/src/entrypoints/local-server.entrypoint.ts`
- `import {serve} from '@hono/node-server'` - Node-specific server
- `process.env.PORT` - Environment variable access
- This entire file is Node-specific and should remain in the Node platform

### `/packages/springboard/server/src/ws_server_core_dependencies.ts`
- `import fs from 'fs'` - Node.js file system
- `process.env.SQLITE_DATABASE_FILE` - Environment variable
- SQLite file-based database - Node-specific
- File system operations for creating directories

## Patterns for Abstraction

1. **Interface-based abstractions**: Define generic interfaces (like `KVStore`) that platforms implement
2. **Platform-specific entrypoints**: Each platform has its own entrypoint that configures the app
3. **Dependency injection**: Pass platform-specific implementations through constructors
4. **Environment abstraction**: Create an interface for accessing environment variables
5. **Storage abstraction**: Use generic storage interfaces instead of file system
6. **Asset serving abstraction**: Define how static files are served per platform
7. **WebSocket abstraction**: Define generic connection handling interface

## Recommendations for springboard-server

1. Move all Node-specific code to platform packages
2. Create abstractions for:
   - Environment variables
   - File/asset serving
   - WebSocket connections
   - Storage/persistence
   - Server startup
3. Keep only generic Hono app setup and registration logic in springboard-server
4. Let each platform provide its own implementations of these abstractions

## Build Process Analysis

### Current Build Functions

#### buildApplication (packages/springboard/cli/src/build.ts:161)
- Builds platform-specific bundles (browser, node, tauri, etc.)
- Takes a `BuildConfig` that specifies platform details
- Creates dynamic entry that imports both platform entrypoint and application entrypoint
- Platform can be 'browser', 'node', 'neutral' (for tauri)
- Handles bundling, minification, and platform-specific plugins

#### buildServer (packages/springboard/cli/src/build.ts:296)
- **Node-specific** - hardcoded to platform: 'node'
- Builds a server bundle that imports:
  1. A core server file (defaults to springboard-server's local-server entrypoint)
  2. An optional server entrypoint
  3. The application bundle from buildApplication
- Creates a Node.js-specific server bundle

### The Problem
- `buildServer` is redundant and Node-specific
- It's essentially just another platform build but with hardcoded Node assumptions
- The separation between "application" and "server" builds is artificial
- Each platform should handle its own server requirements through its platform entrypoint

### Proposed Solution
1. Remove `buildServer` entirely
2. Each server platform (node, partykit, cloudflare) should be built via `buildApplication`
3. Server platforms can import their application code as needed
4. This simplifies the build process and removes Node bias