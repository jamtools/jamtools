/**
 * Cloudflare Worker entrypoint using partyserver
 * This replaces the custom Durable Object implementation with partyserver
 */

import { Server } from 'partyserver';
import { Hono } from 'hono';

import springboard from 'springboard';
import type { NodeAppDependencies } from '@springboardjs/platforms-node/entrypoints/main';
import { Springboard } from 'springboard/engine/engine';

import { initApp, PartykitKvForHttp } from '../partykit_hono_app';
import { startSpringboardApp } from './partykit_server_entrypoint';
import { PartykitJsonRpcServer } from '../services/partykit_rpc_server';

/**
 * Springboard Room using partyserver
 * Handles WebSocket connections, HTTP requests, and persistent storage
 */
export class SpringboardRoom extends Server {
  private app: Hono;
  private nodeAppDependencies: NodeAppDependencies;
  private springboardApp: Springboard | null = null;
  private rpcService: PartykitJsonRpcServer;
  private kv: Record<string, string> = {};
  private isInitialized = false;
  private room: any; // Store room reference for storage and broadcast access

  constructor(room: any) {
    super(room);
    this.room = room;
    
    const { app, nodeAppDependencies, rpcService } = initApp({
      kvForHttp: this.makeKvStoreForHttp(),
      room: this.createRoomAdapter(),
    });

    this.app = app;
    this.nodeAppDependencies = nodeAppDependencies;
    this.rpcService = rpcService;
  }

  /**
   * Handle HTTP requests
   */
  async onRequest(request: Request): Promise<Response> {
    await this.ensureInitialized();

    const url = new URL(request.url);

    // Handle static asset requests
    if (url.pathname === '' || url.pathname === '/') {
      return this.serveStaticAsset('/dist/index.html');
    }

    // Handle API requests through Hono app
    return this.handleHttpRequest(request);
  }

  /**
   * Handle WebSocket connections
   */
  async onConnect(connection: any, request: Request): Promise<void> {
    await this.ensureInitialized();
    // WebSocket is automatically managed by partyserver
  }

  /**
   * Handle incoming WebSocket messages
   */
  async onMessage(connection: any, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === 'string') {
      await this.rpcService.onMessage(message, this.createConnectionAdapter(connection));
    }
  }

  /**
   * Handle WebSocket disconnections
   */
  async onClose(connection: any): Promise<void> {
    // Cleanup logic can be added here
  }

  /**
   * Handle WebSocket errors
   */
  async onError(connection: any, error: Error): Promise<void> {
    console.error('WebSocket error:', error);
  }

  /**
   * Ensure the room is properly initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize Springboard if not already done
    if (!this.springboardApp) {
      springboard.reset();
      
      // Load existing key-value pairs from storage
      const values = await this.room.storage.list();
      for (const [key, value] of values) {
        this.kv[key] = value as string;
      }

      this.springboardApp = await startSpringboardApp(this.nodeAppDependencies);
    }

    this.isInitialized = true;
  }

  /**
   * Handle HTTP requests through the Hono app
   */
  private async handleHttpRequest(request: Request): Promise<Response> {
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
        const serialized = JSON.stringify(value);
        this.kv[key] = serialized;
        // Persist to storage
        await this.room.storage.put(key, serialized);
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
        get: (key: string) => this.room.storage.get(key),
        put: (key: string, value: any) => this.room.storage.put(key, value),
        list: (options: any) => this.room.storage.list(options),
        delete: (key: string) => this.room.storage.delete(key),
      },
      broadcast: (message: string) => this.broadcast(message),
    };
  }

  /**
   * Create a connection adapter for WebSocket
   */
  private createConnectionAdapter(connection: any) {
    return {
      send: (message: string) => {
        connection.send(message);
      },
      close: () => connection.close(),
    };
  }

  /**
   * Broadcast message to all connected WebSockets
   */
  private broadcast(message: string): void {
    // Use partyserver's built-in broadcast functionality
    // The Server class from partyserver should have broadcast method
    super.broadcast(message);
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
          <body><h1>Jamtools Springboard - Cloudflare Worker (partyserver)</h1></body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
}

/**
 * Export for partyserver
 */
export default SpringboardRoom;