import {JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import {Context} from 'hono';
import {WSContext, WSEvents} from 'hono/ws';
import {RpcMiddleware} from '@/register';

import {nodeRpcAsyncLocalStorage} from '@springboardjs/platforms-node/services/node_rpc_async_local_storage';
import {Springboard} from 'springboard/engine/engine';
import {UserData} from 'springboard/engine/module_api';

type WebsocketInterface = {
    send: (s: string) => void;
}

type NodeJsonRpcServerInitArgs = {
    processRequest: (message: string, userData: UserData) => Promise<string>;
    rpcMiddlewares: RpcMiddleware[];
}

export class NodeJsonRpcServer {
    private incomingClients: {[clientId: string]: WebsocketInterface} = {};
    private outgoingClients: {[clientId: string]: JSONRPCClient} = {};
    private hookTriggers?: Springboard['hookTriggers'];

    constructor(private initArgs: NodeJsonRpcServerInitArgs) { }

    public setHookTriggers(hookTriggers: Springboard['hookTriggers']) {
        this.hookTriggers = hookTriggers;
    }

    // New function: this will be used for async things like toasts
    // public sendMessage = (message: string, clientId: string) => {
    //     this.incomingClients[clientId]?.send(message);
    // };

    public broadcastMessage = (message: string) => {
        for (const c of Object.keys(this.incomingClients)) {
            this.incomingClients[c]?.send(message);
        }
    };

    public handleConnection = (c: Context): WSEvents => {
        let providedClientId = '';
        // let isMaestro = false;

        const incomingClients = this.incomingClients;
        const outgoingClients = this.outgoingClients;

        const req = c.req;

        if (req.url?.includes('?')) {
            const urlParams = new URLSearchParams(req.url.substring(req.url.indexOf('?')));
            providedClientId = urlParams.get('clientId') || '';
        }

        const clientId = providedClientId || `${Date.now()}`;

        let wsStored: WSContext | undefined;

        const client = new JSONRPCClient((request: JSONRPCRequest) => {
            if (wsStored?.readyState === WebSocket.OPEN) {
                wsStored.send(JSON.stringify(request));
                return Promise.resolve();
            } else {
                return Promise.reject(new Error('WebSocket is not open'));
            }
        });

        outgoingClients[clientId] = client;

        return {
            onOpen: (event, ws) => {
                incomingClients[clientId] = ws;
                wsStored = ws;
                this.hookTriggers?.handleUserConnect({id: clientId}, Object.keys(incomingClients).map(id => ({id})));
            },
            onMessage: async (event, ws) => {
                const message = event.data.toString();
                // console.log(message);

                if (!message) {
                    return;
                }

                const jsonMessage = JSON.parse(message);
                if (!jsonMessage) {
                    return;
                }

                // console.log(jsonMessage);

                if (jsonMessage.jsonrpc !== '2.0') {
                    return;
                }

                if (!jsonMessage.method) {
                    return;
                }

                (async () => {
                    const rpcContext: object = {};
                    for (const middleware of this.initArgs.rpcMiddlewares) {
                        try {
                            const middlewareResult = await middleware(c);
                            Object.assign(rpcContext, middlewareResult);
                        } catch (e) {
                            incomingClients[clientId]?.send(JSON.stringify({
                                jsonrpc: '2.0',
                                id: jsonMessage.id,
                                error: (e as Error).message,
                            }));
                            return;
                        }
                    }

                    nodeRpcAsyncLocalStorage.run(rpcContext, async () => {
                        const response = await this.initArgs.processRequest(message, {userId: clientId});
                        incomingClients[clientId]?.send(response);
                    });
                })();
            },
            onClose: () => {
                delete incomingClients[clientId];
                delete outgoingClients[clientId];

                const connectedUsers = Object.keys(incomingClients).map(id => ({id})).filter(id => id !== clientId);
                this.hookTriggers?.handleUserDisconnect({id: clientId}, connectedUsers);
            },
        };
    };
}
