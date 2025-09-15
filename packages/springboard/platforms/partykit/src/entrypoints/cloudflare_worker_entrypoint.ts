/**
 * Cloudflare Worker entrypoint that replaces PartyKit with partyserver
 * This provides the same functionality as partykit_server_entrypoint.ts but runs on Cloudflare Workers
 */

import { Hono } from 'hono';

import springboard from 'springboard';
import type { NodeAppDependencies } from '@springboardjs/platforms-node/entrypoints/main';
import { makeMockCoreDependencies } from 'springboard/test/mock_core_dependencies';
import { Springboard } from 'springboard/engine/engine';
import { CoreDependencies } from 'springboard/types/module_types';

import { initApp, PartykitKvForHttp } from '../partykit_hono_app';
import { startSpringboardApp } from './partykit_server_entrypoint';
import { PartykitJsonRpcServer } from '../services/partykit_rpc_server';

// Environment interface for TypeScript support
interface Env {
  SPRINGBOARD_ROOM: DurableObjectNamespace;
  ENVIRONMENT?: string;
}

/**
 * Durable Object that replaces PartyKit's Room functionality
 * Handles WebSocket connections, HTTP requests, and persistent storage
 */
export class SpringboardRoom {
  private app: Hono;
  private nodeAppDependencies: NodeAppDependencies;
  private springboardApp: Springboard | null = null;
  private rpcService: PartykitJsonRpcServer;
  private kv: Record<string, string> = {};
  private sessions = new Set<WebSocket>();
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    
    const { app, nodeAppDependencies, rpcService } = initApp({
      kvForHttp: this.makeKvStoreForHttp(),
      room: this.createRoomAdapter(),
    });

    this.app = app;
    this.nodeAppDependencies = nodeAppDependencies;
    this.rpcService = rpcService;
    
    // Initialize storage from Durable Object state
    this.initializeStorage();
  }

  /**
   * Handle all requests to this Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrades
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    // Handle static asset requests
    if (url.pathname === '' || url.pathname === '/') {
      return this.serveStaticAsset('/dist/index.html');
    }

    // Handle API requests through Hono app
    return this.handleHttpRequest(request);
  }

  /**
   * Handle WebSocket upgrade requests
   */
  private handleWebSocketUpgrade(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    this.state.acceptWebSocket(server);
    this.sessions.add(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle HTTP requests through the Hono app
   */
  private async handleHttpRequest(request: Request): Response {
    const url = new URL(request.url);
    const urlParts = url.pathname.split('/');
    const partyName = urlParts[2];
    const roomName = urlParts[3];

    const prefixToRemove = `/parties/${partyName}/${roomName}`;
    const newUrl = request.url.replace(prefixToRemove, '');
    const newReq = new Request(newUrl, request as any);

    return this.app.fetch(newReq);
  }

  /**
   * Handle incoming WebSocket messages
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === 'string') {
      await this.rpcService.onMessage(message, this.createConnectionAdapter(ws));
    }
  }

  /**
   * Handle WebSocket connection closures
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.sessions.delete(ws);
    // Perform any cleanup logic here
  }

  /**
   * Handle WebSocket connection errors
   */
  async webSocketError(ws: WebSocket, error: Error): Promise<void> {
    console.error('WebSocket error:', error);
    this.sessions.delete(ws);
  }

  /**
   * Initialize storage from Durable Object state
   */
  private async initializeStorage(): Promise<void> {
    // Initialize Springboard if not already done
    if (!this.springboardApp) {
      springboard.reset();
      
      // Load existing key-value pairs from Durable Object storage
      const values = await this.state.storage.list({ limit: 100 });
      for (const [key, value] of values) {
        this.kv[key] = value as string;
      }

      this.springboardApp = await startSpringboardApp(this.nodeAppDependencies);
    }
  }

  /**
   * Create a KV store adapter for HTTP requests
   */
  private makeKvStoreForHttp = (): PartykitKvForHttp => {
    return {
      get: async (key: string) => {
        const value = this.kv[key];
        if (!value) {
          return null;
        }
        return JSON.parse(value);
      },
      getAll: async () => {
        const allEntriesAsRecord: Record<string, any> = {};
        for (const key of Object.keys(this.kv)) {
          allEntriesAsRecord[key] = JSON.parse(this.kv[key]);
        }
        return allEntriesAsRecord;
      },
      set: async (key: string, value: unknown) => {
        this.kv[key] = JSON.stringify(value);
        // Persist to Durable Object storage
        await this.state.storage.put(key, JSON.stringify(value));
      },
    };
  };

  /**
   * Create a room adapter that provides PartyKit-like API
   */
  private createRoomAdapter() {
    return {
      context: {
        assets: {
          fetch: (path: string) => this.serveStaticAsset(path),
        },
      },
      storage: {
        get: (key: string) => this.state.storage.get(key),
        put: (key: string, value: any) => this.state.storage.put(key, value),
        list: (options: any) => this.state.storage.list(options),
        delete: (key: string) => this.state.storage.delete(key),
      },
      broadcast: (message: string) => this.broadcast(message),
    };
  }

  /**
   * Create a connection adapter for WebSocket
   */
  private createConnectionAdapter(ws: WebSocket) {
    return {
      send: (message: string) => {
        if (ws.readyState === WebSocket.READY_STATE_OPEN) {
          ws.send(message);
        }
      },
      close: () => ws.close(),
    };
  }

  /**
   * Broadcast message to all connected WebSockets
   */
  private broadcast(message: string): void {
    this.sessions.forEach(ws => {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Serve static assets (placeholder implementation)
   */
  private async serveStaticAsset(path: string): Promise<Response> {
    // In a real implementation, you would fetch from Cloudflare's assets
    // For now, return a basic HTML response
    if (path.includes('.html')) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head><title>Jamtools Springboard</title></head>
          <body><h1>Jamtools Springboard - Cloudflare Worker</h1></body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
}

/**
 * Main Worker fetch handler
 * Routes requests to appropriate Durable Objects
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Extract room name from URL path
    const pathParts = url.pathname.split('/');
    let roomName = 'default';
    
    if (pathParts.length >= 4 && pathParts[1] === 'parties') {
      roomName = pathParts[3] || 'default';
    }

    // Get Durable Object instance for this room
    const id = env.SPRINGBOARD_ROOM.idFromName(roomName);
    const durableObject = env.SPRINGBOARD_ROOM.get(id);

    // Forward request to Durable Object
    return durableObject.fetch(request);
  },

  /**
   * Handle scheduled events (if needed)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Implement scheduled tasks if needed
  },
};