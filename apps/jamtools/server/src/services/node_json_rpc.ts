import {WebSocketServer, WebSocket} from 'ws';
import {JSONRPCServer, JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import {ModuleDependencies, RpcArgs} from '~/core/types/module_types';

type RpcClient = ModuleDependencies['rpc'];

export class NodeJsonRpcServer implements RpcClient {
    rpcClient!: JSONRPCClient;

    constructor(private wss: WebSocketServer) {}

    callRpc = async <Return, Args>(method: string, args: Args): Promise<Return> => {
        const result = await this.rpcClient.request(method, args);
        return result;
    };

    registerRpc = <Args, Return>(name: string, cb: (args: Args) => Promise<Return>) => {
        return cb;
    };

    broadcastRpc = async <Args>(name: string, args: Args, rpcArgs?: RpcArgs | undefined): Promise<void> => {
        this.rpcClient.notify(name, args);
        return;
    };

    maestroClientId = '';

    initialize = async (): Promise<boolean> => {
        const wss = this.wss;
        // const wss = new WebSocketServer({port: 8080});

        const jsonRpcServer = new JSONRPCServer();

        const incomingClients: {[clientId: string]: WebSocket} = {};
        const outgoingClients: {[clientId: string]: JSONRPCClient} = {};

        wss.on('connection', (ws: WebSocket, req) => {
            let providedClientId = '';
            let isMaestro = false;

            if (req.url?.includes('?')) {
                const urlParams = new URLSearchParams(req.url.substring(req.url.indexOf('?')));
                providedClientId = urlParams.get('clientId') || '';
                isMaestro = urlParams.get('is_maestro') === 'true';
            }

            const clientId = providedClientId || `${Date.now()}`;
            incomingClients[clientId] = ws;

            if (isMaestro || !this.maestroClientId) {
                this.maestroClientId = clientId;
            }

            const client = new JSONRPCClient((request: JSONRPCRequest) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(request));
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error('WebSocket is not open'));
                }
            });

            outgoingClients[clientId] = client;

            ws.on('message', async (data) => {
                const message = data.toString();
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
                // } else {
                //     console.log('receive 2')
                //     client.receive(jsonMessage);
                // }
            });

            jsonRpcServer.addMethod('echo-to-server', ({text}: {text: string}) => {
                // console.log(`Received from client: ${text}`);
                return `Echoed by server: ${text}`;
            });

            ws.on('close', () => {
                delete incomingClients[clientId];
                delete outgoingClients[clientId];
            });

        });

        console.log('WebSocket server is running on ws://localhost:8080');
        return true;
    };
}
