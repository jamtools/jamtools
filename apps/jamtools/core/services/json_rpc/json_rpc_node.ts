import {WebSocketServer, WebSocket} from 'ws';
import {JSONRPCServer, JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import {ModuleDependencies} from '~/types/module_types';

type RpcClient = Pick<ModuleDependencies, 'callRpc'>;

export class NodeJsonRpcServer implements RpcClient {
    rpcClient!: JSONRPCClient;

    callRpc = async <Return, Args>(method: string, args: Args): Promise<Return> => {
        const result = await this.rpcClient.request(method, args);
        return result;
    };

    initialize = async () => {
        const wss = new WebSocketServer({port: 8080});

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
                const jsonMessage = JSON.parse(message);
                console.log(jsonMessage);

                if (jsonMessage.jsonrpc === '2.0' && jsonMessage.method) {
                    for (const c of Object.keys(outgoingClients)) {
                        if (c === clientId) {
                            continue;
                        }

                        outgoingClients[c].send(jsonMessage);
                    }
                } else {
                    client.receive(jsonMessage);
                }
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

const service = new NodeJsonRpcServer();
service.initialize();
