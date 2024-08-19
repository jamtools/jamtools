import {JSONRPCClient, JSONRPCServer} from 'json-rpc-2.0';
import {ModuleDependencies, RpcArgs} from '~/types/module_types';

type RpcClient = Pick<ModuleDependencies, 'callRpc'>;
export class BrowserJsonRpcClientAndServer implements RpcClient {
    rpcClient!: JSONRPCClient;

    constructor (private url: string) {}

    callRpc = async <Return, Args>(method: string, args: Args): Promise<Return> => {
        const result = await this.rpcClient.request(method, args);
        return result;
    };

    initialize = async () => {
        const ws = new WebSocket(this.url);

        this.rpcClient = new JSONRPCClient((request) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(request));
                return Promise.resolve();
            } else {
                return Promise.reject(new Error('WebSocket is not open'));
            }
        });

        const jsonRpcServer = new JSONRPCServer();

        ws.onopen = () => {
            this.callRpc<string, any>('echo-to-server', {text: 'Hello, server!'}).then((response) => {
                console.log('Response from server:', response);
            });
        };

        ws.onmessage = (event) => {
            const jsonMessage = JSON.parse(event.data);

            if (jsonMessage.jsonrpc === '2.0' && jsonMessage.method) {
                // Handle incoming RPC requests coming from the server to run in this client
                jsonRpcServer.receive(jsonMessage);
            } else {
                // Handle incoming RPC responses after calling an rpc method on the server
                console.log(jsonMessage);
                this.rpcClient.receive(jsonMessage);
            }
        };

        jsonRpcServer.addMethod('echo-to-client', ({text}: {text: string}) => {
            console.log(`Client received: ${text}`);
            return `Echoed by client: ${text}`;
        });
    };
}

const service = new BrowserJsonRpcClientAndServer('ws://localhost:8080');
service.initialize();
