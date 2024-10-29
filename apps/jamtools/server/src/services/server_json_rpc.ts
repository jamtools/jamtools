import {JSONRPCServer, JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import {Context} from 'hono';
import {WSContext, WSEvents} from 'hono/ws';

type WebsocketInterface = {
    send: (s: string) => void;
}

export class NodeJsonRpcServer {
    rpcClient!: JSONRPCClient;
    rcpServer: JSONRPCServer;

    incomingClients: {[clientId: string]: WebsocketInterface} = {};
    outgoingClients: {[clientId: string]: JSONRPCClient} = {};

    constructor() {
        this.rcpServer = new JSONRPCServer();
    }

    maestroClientId = '';

    public handleConnection = (c: Context): WSEvents => {
        let providedClientId = '';
        let isMaestro = false;

        const incomingClients = this.incomingClients;
        const outgoingClients = this.outgoingClients;

        const req = c.req;

        if (req.url?.includes('?')) {
            const urlParams = new URLSearchParams(req.url.substring(req.url.indexOf('?')));
            providedClientId = urlParams.get('clientId') || '';
            isMaestro = urlParams.get('is_maestro') === 'true';
        }

        const clientId = providedClientId || `${Date.now()}`;

        if (isMaestro || !this.maestroClientId) {
            this.maestroClientId = clientId;
        }

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
            },
            onMessage: (event, ws) => {
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
                    // this is a response
                    const clientId = jsonMessage.clientId as string | undefined;
                    if (clientId) {
                        incomingClients[clientId]?.send(message);
                    }

                    return;
                }

                if (clientId !== this.maestroClientId) {
                    incomingClients[this.maestroClientId]?.send(message);
                    return;
                }

                if (jsonMessage.id) {
                    // console.log('this shouldnt happen')
                    return;
                }

                // broadcast message

                for (const c of Object.keys(incomingClients)) {
                    if (c === clientId) {
                        continue;
                    }

                    const method = jsonMessage.method;
                    const args = jsonMessage.params;

                    incomingClients[c]?.send(message);

                    // const result = await outgoingClients[c].request(method, args);
                    // client.send(result);
                }
            },
            onClose: () => {
                delete incomingClients[clientId];
                delete outgoingClients[clientId];
            },
        };
    };
}
