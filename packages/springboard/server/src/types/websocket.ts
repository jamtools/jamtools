import { Context } from 'hono';
import { WSEvents } from 'hono/ws';
import { Hono } from 'hono';

export interface WebSocketProvider {
    /**
     * Create WebSocket upgrade handler for the given app
     */
    createWebSocketHandler(app: Hono): {
        upgradeWebSocket: (handler: (c: Context) => WSEvents) => (c: Context) => Response | Promise<Response>;
        injectWebSocket?: (server: unknown) => void;
    };
}