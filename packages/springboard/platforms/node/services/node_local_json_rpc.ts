import {JSONRPCClient, JSONRPCServer} from 'json-rpc-2.0';
import {ActionCallOptions, UserData} from 'springboard/engine/module_api';

import {Rpc, RpcArgs} from 'springboard/types/module_types';

type NodeLocalJsonRpcClientAndServerInitArgs = {
    broadcastMessage: (message: string) => void;
}

export class NodeLocalJsonRpcClientAndServer implements Rpc {
    rpcClient: JSONRPCClient;
    rpcServer: JSONRPCServer;

    public role = 'server' as const;

    constructor(private initArgs: NodeLocalJsonRpcClientAndServerInitArgs) {
        this.rpcServer = new JSONRPCServer();
        this.rpcClient = new JSONRPCClient(async (request) => {
            this.initArgs.broadcastMessage(JSON.stringify(request));
        });
    }

    initialize = async (): Promise<boolean> => {
        return true;
    };

    registerRpc = <Args, Return>(method: string, cb: (args: Args, options: ActionCallOptions, userData?: UserData) => Promise<Return>) => {
        this.rpcServer.addMethod(method, async (args: {params: Args} & {userData?: UserData}) => {
            const result = await cb(args.params, {mode: 'remote'}, args.userData);
            return result;
        });
    };

    callRpc = async <Return, Args>(method: string, args: Args): Promise<Return> => {
        const result = await this.rpcClient.request(method, args);
        return result;
    };

    broadcastRpc = async <Args>(method: string, args: Args, _rpcArgs?: RpcArgs | undefined): Promise<void> => {
        return this.rpcClient.notify(method, args);
    };

    public processRequest = async (jsonMessageStr: string, userData: UserData) => {
        let jsonMessage = JSON.parse(jsonMessageStr) as {
            jsonrpc: '2.0';
            id: number;
            method: string;
            params?: any;
            clientId: string;
        };

        const originalParams = jsonMessage.params;
        jsonMessage.params = {
            params: originalParams,
            userData,
        }

        const result = await this.rpcServer.receive(jsonMessage);
        if (result) {
            (result as any).clientId = (jsonMessage as unknown as any).clientId;
        }

        return JSON.stringify(result);
    };
}
