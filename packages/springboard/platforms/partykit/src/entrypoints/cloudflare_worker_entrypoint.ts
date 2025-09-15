/**
 * Cloudflare Worker entrypoint using partyserver
 * Extends Server class for proper partyserver integration
 */

import { routePartykitRequest, Server } from "partyserver";

/**
 * Springboard Room extending partyserver's Server class
 * Handles WebSocket connections, HTTP requests, and persistent storage
 */
export class SpringboardRoom extends Server {
  constructor(room: any, env: any) {
    super(room, env);
  }

  onConnect(connection: any) {
    console.log("Connected", connection.id, "to server", this.name);
    // Initialize connection for Springboard framework
    // TODO: Integrate with Springboard's RPC service
  }

  onMessage(connection: any, message: string | ArrayBuffer) {
    console.log("Message from", connection.id, ":", message);
    
    // Handle Springboard RPC messages
    if (typeof message === 'string') {
      try {
        const data = JSON.parse(message);
        // TODO: Process through Springboard's RPC service
        // For now, echo back the message
        this.broadcast(message, [connection.id]);
      } catch (error) {
        console.error('Error parsing message:', error);
        connection.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    }
  }

  onClose(connection: any, code: number, reason: string, wasClean: boolean) {
    console.log("Disconnected", connection.id, "from server", this.name, { code, reason, wasClean });
    // TODO: Clean up any Springboard resources for this connection
  }

  onError(connection: any, error: unknown) {
    console.error("Error on connection", connection.id, ":", error);
    // TODO: Handle error through Springboard's error handling system
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle static asset requests
    if (url.pathname === '' || url.pathname === '/') {
      return this.serveStaticAsset('/dist/index.html');
    }
    
    // Handle API requests for Springboard
    if (url.pathname.startsWith('/api/')) {
      // TODO: Route through Springboard's HTTP handlers
      return new Response(JSON.stringify({ message: 'API endpoint - under construction' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
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
          <body>
            <h1>Jamtools Springboard - Cloudflare Worker (partyserver)</h1>
            <p>WebSocket server running with partyserver</p>
          </body>
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
      const response = await routePartykitRequest(request, env);
      
      if (response) {
        return response;
      }
      
      // Fallback to default response
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};