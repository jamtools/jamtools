import {JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import {Context} from 'hono';
import {defineHooks} from 'crossws';
import type {Peer, Message as WSMessage} from 'crossws';
import {RpcMiddleware} from '../register';

import {nodeRpcAsyncLocalStorage} from '@springboardjs/platforms-node/services/node_rpc_async_local_storage';

type WebsocketInterface = {
    send: (s: string) => void;
    id?: string;
}

type NodeJsonRpcServerInitArgs = {
    processRequest: (message: string) => Promise<string>;
    rpcMiddlewares: RpcMiddleware[];
}

// declare module 'crossws' {
//     interface PeerContext {
//         hey: string;
//     }
// }

export class CrossWsJsonRpcServer {
    private incomingClients: {[clientId: string]: WebsocketInterface} = {};
    private outgoingClients: {[clientId: string]: JSONRPCClient} = {};

    constructor(private initArgs: NodeJsonRpcServerInitArgs) { }

    // New function: this will be used for async things like toasts
    // public sendMessage = (message: string, clientId: string) => {
    //     this.incomingClients[clientId]?.send(message);
    // };

    public broadcastMessage = (message: string) => {
        for (const c of Object.keys(this.incomingClients)) {
            this.incomingClients[c]?.send(message);
        }
    };

    public createWebSocketHooks = () => defineHooks({
        open: (peer: Peer) => {
            peer.peers
            const url = peer.request?.url;
            let providedClientId = '';

            if (url?.includes('?')) {
                const urlParams = new URLSearchParams(url.substring(url.indexOf('?')));
                providedClientId = urlParams.get('clientId') || '';
            }

            const clientId = providedClientId || `${Date.now()}`;

            // Store clientId on the peer for later use
            (peer as any).clientId = clientId;

            const client = new JSONRPCClient((request: JSONRPCRequest) => {
                peer.send(JSON.stringify(request));
                return Promise.resolve();
            });

            this.outgoingClients[clientId] = client;
            this.incomingClients[clientId] = peer;
        },

        message: async (peer: Peer, message: WSMessage) => {
            // const messageStr = message.text();

            // // Create a minimal context object for middleware compatibility
            // const minimalContext = {
            //     req: peer.request || { url: '/' },
            // } as unknown as Context;

            // const response = await this.processRequestWithMiddleware(minimalContext, messageStr);
            // if (!response) {
            //     return;
            // }

            // peer.send(response);
        },

        close: (peer: Peer) => {
            const clientId = (peer as any).clientId;
            if (clientId) {
                delete this.incomingClients[clientId];
                delete this.outgoingClients[clientId];
            }
        },
    });

    processRequestWithMiddleware = async (c: Context, message: string) => {
        // if (!message) {
        //     return;
        // }

        // const jsonMessage = JSON.parse(message);
        // if (!jsonMessage) {
        //     return;
        // }

        // if (jsonMessage.jsonrpc !== '2.0') {
        //     return;
        // }

        // if (!jsonMessage.method) {
        //     return;
        // }

        // const rpcContext: object = {};
        // for (const middleware of this.initArgs.rpcMiddlewares) {
        //     try {
        //         const middlewareResult = await middleware(c);
        //         Object.assign(rpcContext, middlewareResult);
        //     } catch (e) {
        //         return JSON.stringify({
        //             jsonrpc: '2.0',
        //             id: jsonMessage.id,
        //             error: (e as Error).message,
        //         });
        //     }
        // }

        // return new Promise<string>((resolve) => {
        //     nodeRpcAsyncLocalStorage.run(rpcContext, async () => {
        //         const response = await this.initArgs.processRequest(message);
        //         resolve(response);
        //     });
        // });
    };
}
