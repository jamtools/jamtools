import {JSONRPCClient, JSONRPCServer} from 'json-rpc-2.0';
import {Rpc, RpcArgs} from 'springboard/types/module_types';

import PartySocket from 'partysocket';

type ClientParams = {
    clientId: string;
}

export class PartyKitRpcClient implements Rpc {
    rpcClient?: JSONRPCClient<ClientParams>;
    rpcServer?: JSONRPCServer;

    public role = 'client' as const;

    private conn!: PartySocket;

    constructor(private host: string, private room: string) {
    }

    private clientId = '';

    private getClientId = () => {
        if (this.clientId) {
            return this.clientId;
        }

        const fromStorage = sessionStorage.getItem('ws-client-id');
        if (fromStorage) {
            this.clientId = fromStorage;
            return this.clientId;
        }

        const newClientId = Math.random().toString().slice(2); // TODO: this should instead be server-assigned
        this.clientId = newClientId;
        return this.clientId;
    };

    public registerRpc = <Args, Return>(method: string, cb: (args: Args) => Promise<Return>) => {
        this.rpcServer?.addMethod(method, async (args) => {
            const result = await cb(args);
            return result;
        });
    };

    public callRpc = async <Return, Args>(method: string, args: Args): Promise<Return> => {
        const params = {clientId: this.getClientId()};
        const result = await this.rpcClient?.request(method, args, params);
        return result;
    };

    public broadcastRpc = async <Args>(method: string, args: Args, _rpcArgs?: RpcArgs | undefined): Promise<void> => {
        if (!this.rpcClient) {
            // throw new Error(`tried to broadcast rpc but not connected to websocket`);
            return;
        }

        const params = {clientId: this.getClientId()};
        return this.rpcClient.notify(method, args, params);
    };

    private initializeWebsocket = async () => {
        const forceError = false;
        if (forceError) {
            return false;
        }

        this.conn = new PartySocket({
            host: this.host,
            room: this.room,
        });

        const ws = this.conn;

        ws.onmessage = async (event) => {
            const jsonMessage = JSON.parse(event.data);

            if (jsonMessage.jsonrpc === '2.0' && jsonMessage.method) {
                // Handle incoming RPC requests coming from the server to run in this client
                const result = await this.rpcServer?.receive(jsonMessage);
                if (result) {
                    (result as any).clientId = (jsonMessage as unknown as any).clientId;
                }
                ws.send(JSON.stringify(result));
            } else {
                // Handle incoming RPC responses after calling an rpc method on the server
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
            };
        });
    };

    public initialize = async (): Promise<boolean> => {
        this.rpcServer = new JSONRPCServer();
        try {
            return this.initializeWebsocket();
        } catch (e) {
            return false;
        }
    };
}
