import {WebSocketServer, WebSocket} from 'ws';
import {JSONRPCServer, JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import {ModuleDependencies} from '~/core/types/module_types';

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

    initialize = async () => {
        const wss = this.wss;
        // const wss = new WebSocketServer({port: 8080});

        const jsonRpcServer = new JSONRPCServer();

        const incomingClients: {[clientId: string]: WebSocket} = {};
        const outgoingClients: {[clientId: string]: JSONRPCClient} = {};

        wss.on('connection', (ws: WebSocket) => {
            const clientId = `${Date.now()}`; // Generate a simple client ID
            incomingClients[clientId] = ws;

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

                // if (jsonMessage.jsonrpc === '2.0' && jsonMessage.method) {
                for (const c of Object.keys(incomingClients)) {
                    if (c === clientId) {
                        continue;
                    }

                    const method = jsonMessage.method;
                    const args = jsonMessage.params;

                    incomingClients[c].send(message);

                    // const result = await outgoingClients[c].request(method, args);
                    // client.send(result);
                }
                // } else {
                //     console.log('receive 2')
                //     client.receive(jsonMessage);
                // }
            });

            jsonRpcServer.addMethod('echo-to-server', ({text}: {text: string}) => {
                console.log(`Received from client: ${text}`);
                return `Echoed by server: ${text}`;
            });

            ws.on('close', () => {
                delete incomingClients[clientId];
                delete outgoingClients[clientId];
            });
        });

        console.log('WebSocket server is running on ws://localhost:8080');
    };
}
