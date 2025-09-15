/**
 * Cloudflare Worker entrypoint using partyserver
 * This uses partyserver utilities without extending the Server class to avoid type conflicts
 */

import { routePartykitRequest } from 'partyserver';

/**
 * Springboard Room using partyserver routing
 * Handles WebSocket connections, HTTP requests, and persistent storage
 */
class SpringboardRoom implements DurableObject {
  private kv: Record<string, string> = {};
  private isInitialized = false;
  private ctx: DurableObjectState;
  private env: any;
  private connections = new Set<WebSocket>();

  constructor(ctx: DurableObjectState, env: any) {
    this.ctx = ctx;
    this.env = env;
  }

  /**
   * Handle HTTP requests (DurableObject method)
   */
  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized();

    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    const url = new URL(request.url);

    // Handle static asset requests
    if (url.pathname === '' || url.pathname === '/') {
      return this.serveStaticAsset('/dist/index.html');
    }

    // For now, return a simple response
    return new Response('Cloudflare Worker with partyserver - Under Construction', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  /**
   * Handle WebSocket upgrade requests
   */
  private handleWebSocketUpgrade(request: Request): Response {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();
    this.connections.add(server);

    // Set up event handlers
    server.addEventListener('message', (event) => {
      this.handleWebSocketMessage(server, event.data);
    });

    server.addEventListener('close', () => {
      this.connections.delete(server);
    });

    server.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.connections.delete(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleWebSocketMessage(websocket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === 'string') {
      // For now, just echo the message back
      console.log('Received WebSocket message:', message);
      websocket.send(`Echo: ${message}`);
    }
  }

  /**
   * Ensure the room is properly initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    // Load existing key-value pairs from storage
    const values = await this.ctx.storage.list();
    for (const [key, value] of values) {
      this.kv[key] = value as string;
    }

    this.isInitialized = true;
  }

  /**
   * Simple key-value operations
   */
  private async getFromStorage(key: string): Promise<any> {
    const value = this.kv[key];
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  }

  private async setToStorage(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    this.kv[key] = serialized;
    await this.ctx.storage.put(key, serialized);
  }

  /**
   * Broadcast message to all connected WebSockets
   */
  private broadcastMessage(message: string | ArrayBuffer | ArrayBufferView): void {
    for (const connection of this.connections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(message);
      }
    }
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
 * Main worker fetch handler using partyserver routing
 */
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    try {
      // Use partyserver's routing utility
      const response = await routePartykitRequest(request, env, {
        // Configure partyserver options here if needed
      });
      
      if (response) {
        return response;
      }
      
      // Fallback to default response
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

/**
 * Export the SpringboardRoom class for Durable Objects
 */
export { SpringboardRoom };