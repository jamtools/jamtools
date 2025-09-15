# Cloudflare Worker Migration

This document explains the conversion from PartyKit to Cloudflare Workers using partyserver architecture.

## Files Created

### 1. `cloudflare_worker_entrypoint.ts`
- **Purpose**: Replaces `partykit_server_entrypoint.ts` with Cloudflare Worker implementation
- **Key Features**:
  - Uses Durable Objects instead of PartyKit rooms
  - Maintains same API compatibility with existing Springboard integration
  - Handles WebSocket connections via Cloudflare Workers WebSocket API
  - Provides persistent storage via Durable Object state

### 2. `wrangler.toml`
- **Purpose**: Cloudflare Worker configuration file
- **Key Settings**:
  - Durable Object bindings for `SPRINGBOARD_ROOM`
  - Build configuration
  - Environment variables

## Key Changes from PartyKit

### WebSocket Handling
- **PartyKit**: `onMessage(message, connection)`
- **Cloudflare**: `webSocketMessage(ws, message)` with `WebSocketPair()`

### Storage
- **PartyKit**: `this.room.storage.get/put/list()`
- **Cloudflare**: `this.state.storage.get/put/list()`

### Broadcasting
- **PartyKit**: `this.room.broadcast(message)`
- **Cloudflare**: Manual iteration over WebSocket connections

### Room Management
- **PartyKit**: Automatic room creation and routing
- **Cloudflare**: Durable Object instances created per room name

## Usage

### Development
```bash
npm run dev:worker
```

### Deployment
```bash
npm run deploy:worker
```

### Testing
The implementation maintains full compatibility with the existing Springboard framework and should work with existing client code without modifications.

## Benefits

1. **Cost Efficiency**: Cloudflare Workers pricing vs PartyKit
2. **Global Distribution**: Cloudflare's edge network
3. **Scalability**: Automatic scaling with Durable Objects
4. **Integration**: Better integration with Cloudflare ecosystem
5. **Control**: More control over runtime environment

## Migration Path

The Cloudflare Worker implementation can run alongside the existing PartyKit implementation. To switch:

1. Deploy the Cloudflare Worker
2. Update client connections to point to the Worker URL
3. Migrate data if needed
4. Decommission PartyKit deployment

## Architecture

```
Client Request
    ↓
Worker fetch() handler
    ↓
Route to Durable Object by room name
    ↓
SpringboardRoom.fetch()
    ↓
- Handle WebSocket upgrades
- Process HTTP requests via Hono
- Manage persistent state
```