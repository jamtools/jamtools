import {JSONRPCClient, JSONRPCServer} from 'json-rpc-2.0';
import {ModuleDependencies, RpcArgs} from '~/core/types/module_types';

type RpcClient = ModuleDependencies['rpc'];
export class BrowserJsonRpcClientAndServer implements RpcClient {
    rpcClient!: JSONRPCClient;
    rpcServer!: JSONRPCServer;

    constructor (private url: string) {}

    registerRpc = <Args, Return>(method: string, cb: (args: Args) => Promise<Return>) => {
        this.rpcServer.addMethod(method, async (args) => {
            const result = await cb(args);
            // console.log(`received RPC call for ${method}. Returned:`, result)
            return result;
        });
    };

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

        this.rpcServer = new JSONRPCServer();

        ws.onopen = () => {
            // this.callRpc<string, any>('echo-to-server', {text: 'Hello, server!'}).then((response) => {
            //     console.log('Response from server:', response);
            // });
        };

        ws.onmessage = async (event) => {
            const jsonMessage = JSON.parse(event.data);

            if (jsonMessage.jsonrpc === '2.0' && jsonMessage.method) {
                // Handle incoming RPC requests coming from the server to run in this client
                const result = await this.rpcServer.receive(jsonMessage);
                ws.send(JSON.stringify(result));
            } else {
                // Handle incoming RPC responses after calling an rpc method on the server
                // console.log(jsonMessage);
                this.rpcClient.receive(jsonMessage);
            }
        };

        await new Promise(r => setTimeout(r, 2000));
    };
}
