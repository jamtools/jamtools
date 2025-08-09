import { Context } from 'hono';
import { WSEvents } from 'hono/ws';
import { Hono } from 'hono';
import { WebSocketProvider } from 'springboard-server/types';

/**
 * Cloudflare Workers WebSocket provider
 * Uses Cloudflare's WebSocket API
 */
export class CloudflareWebSocketProvider implements WebSocketProvider {
    constructor(private env: Record<string, unknown>) {}
    
    createWebSocketHandler(app: Hono) {
        const upgradeWebSocket = (handler: (c: Context) => WSEvents) => {
            return async (c: Context) => {
                const { request } = c.req.raw;
                
                // Check if this is a WebSocket upgrade request
                const upgrade = request.headers.get('upgrade');
                if (upgrade !== 'websocket') {
                    return c.text('Expected WebSocket upgrade', 426);
                }
                
                // Create WebSocket pair
                const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
                
                // Set up event handlers
                const events = handler(c);
                
                server.accept();
                
                if (events.onOpen) {
                    // Simulate WSContext for compatibility
                    const wsContext = this.createWSContext(server);
                    events.onOpen({} as Event, wsContext);
                }
                
                server.addEventListener('message', (event) => {
                    if (events.onMessage) {
                        const wsContext = this.createWSContext(server);
                        events.onMessage(event, wsContext);
                    }
                });
                
                server.addEventListener('close', () => {
                    if (events.onClose) {
                        events.onClose();
                    }
                });
                
                return new Response(null, {
                    status: 101,
                    webSocket: client,
                });
            };
        };
        
        return { upgradeWebSocket };
    }
    
    private createWSContext(ws: WebSocket): { send: (data: string) => void; readyState: number; CONNECTING: number; OPEN: number; CLOSING: number; CLOSED: number } {
        return {
            send: (data: string) => ws.send(data),
            readyState: ws.readyState,
            CONNECTING: WebSocket.CONNECTING,
            OPEN: WebSocket.OPEN,
            CLOSING: WebSocket.CLOSING,
            CLOSED: WebSocket.CLOSED,
        };
    }
}

// Cloudflare Workers WebSocketPair type
declare global {
    const WebSocketPair: {
        new(): {
            0: WebSocket;
            1: WebSocket;
        };
    };
}