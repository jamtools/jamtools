import {JSONRPCClient, JSONRPCServer} from 'json-rpc-2.0';
import {Rpc, RpcArgs} from '~/core/types/module_types';

type ClientParams = {
    clientId: string;
}

export class BrowserJsonRpcClientAndServer implements Rpc {
    rpcClient?: JSONRPCClient<ClientParams>;
    rpcServer!: JSONRPCServer;

    constructor (private url: string) {}

    private clientId = '';

    getClientId = () => {
        if (this.clientId) {
            return this.clientId;
        }

        const fromStorage = sessionStorage.getItem('ws-client-id');
        if (fromStorage) {
            this.clientId = fromStorage;
            return this.clientId;
        }

        const newClientId = Math.random().toString().slice(2);
        this.clientId = newClientId;
        return this.clientId;
    };

    registerRpc = <Args, Return>(method: string, cb: (args: Args) => Promise<Return>) => {
        this.rpcServer.addMethod(method, async (args) => {
            const result = await cb(args);
            // console.log(`received RPC call for ${method}. Returned:`, result)
            return result;
        });
    };

    callRpc = async <Return, Args>(method: string, args: Args): Promise<Return> => {
        // console.log('calling rpc', method, JSON.stringify(args));

        const params = {clientId: this.getClientId()};
        const result = await this.rpcClient?.request(method, args, params);
        return result;
    };

    broadcastRpc = async <Args>(method: string, args: Args, _rpcArgs?: RpcArgs | undefined): Promise<void> => {
        if (!this.rpcClient) {
            // throw new Error(`tried to broadcast rpc but not connected to websocket`);
            return;
        }

        // console.log('broadcasting rpc', method, JSON.stringify(args));

        const params = {clientId: this.getClientId()};
        return this.rpcClient.notify(method, args, params);
    };

    retrying = false;

    initializeWebsocket = async () => {
        const forceError = false;
        if (forceError) {
            return false;
        }

        const fullUrl = `${this.url}?clientId=${this.getClientId()}`;
        const ws = new WebSocket(fullUrl);

        ws.onclose = async () => {
            console.error('websocket disconnected');
            console.log('retrying websocket in 5 seconds');

            if (this.retrying) {
                return;
            }
            this.retrying = true;

            setTimeout(() => {
                this.initializeWebsocket();
                this.retrying = false;
            }, 5000);
        };

        ws.onmessage = async (event) => {
            const jsonMessage = JSON.parse(event.data);

            if (jsonMessage.jsonrpc === '2.0' && jsonMessage.method) {
                // Handle incoming RPC requests coming from the server to run in this client
                const result = await this.rpcServer.receive(jsonMessage);
                if (result) {
                    (result as any).clientId = (jsonMessage as unknown as any).clientId;
                }
                ws.send(JSON.stringify(result));
            } else {
                // Handle incoming RPC responses after calling an rpc method on the server
                // console.log(jsonMessage);
                this.rpcClient?.receive(jsonMessage);
            }
        };

        return new Promise<boolean>((resolve, _reject) => {
            let connected = false;

            ws.onopen = () => {
                connected = true;
                console.log('websocket connected');
                this.rpcClient = new JSONRPCClient((request) => {
                    request.clientId = this.getClientId();
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(request));
                        return Promise.resolve();
                    } else {
                        return Promise.reject(new Error('WebSocket is not open'));
                    }
                });
                resolve(true);
            };

            ws.onerror = async (e) => {
                if (!connected) {
                    console.error('failed to connect to websocket');
                    this.rpcClient = new JSONRPCClient(() => {
                        return Promise.reject(new Error('WebSocket is not open'));
                    });
                    resolve(false);
                }

                console.error('Error with websocket', e);
                console.log('retrying websocket in 5 seconds');

                if (this.retrying) {
                    return;
                }
                this.retrying = true;

                setTimeout(() => {
                    this.initializeWebsocket();
                    this.retrying = false;
                }, 5000);
            };
        });
    };

    initialize = async (): Promise<boolean> => {
        this.rpcServer = new JSONRPCServer();
        try {
            return this.initializeWebsocket();
        } catch (e) {
            // console.error(`failed to connect to websocket server`, e);
            return false;
        }
    };
}
