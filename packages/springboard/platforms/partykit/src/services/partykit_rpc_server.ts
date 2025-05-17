// TODO: make this an arbitrary store instead of specifically this one
import {nodeRpcAsyncLocalStorage} from '@springboardjs/platforms-node/services/node_rpc_async_local_storage';
import {Connection, Room} from 'partykit/server';

type PartykitRpcMiddleware = (conn: Connection, room: Room) => Promise<object>;

type PartykitJsonRpcServerInitArgs = {
    processRequest: (message: string) => Promise<string>;
    rpcMiddlewares: PartykitRpcMiddleware[];
}

export class PartykitJsonRpcServer {
    constructor(private initArgs: PartykitJsonRpcServerInitArgs, private room: Room) { }

    public broadcastMessage = (message: string) => {
        this.room.broadcast(message);
    };

    public onMessage = async (message: string, conn: Connection) => {
        if (!message) {
            return;
        }

        const jsonMessage = JSON.parse(message);
        if (!jsonMessage) {
            return;
        }

        if (jsonMessage.jsonrpc !== '2.0') {
            return;
        }

        if (!jsonMessage.method) {
            return;
        }

        const rpcContext: object = {};
        for (const middleware of this.initArgs.rpcMiddlewares) {
            try {
                const middlewareResult = await middleware(conn, this.room);
                Object.assign(rpcContext, middlewareResult);
            } catch (e) {
                conn.send(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonMessage.id,
                    error: (e as Error).message, // TODO: Probably shouldn't show this error directly to the user
                }));
                return;
            }
        }

        nodeRpcAsyncLocalStorage.run(rpcContext, async () => {
            const response = await this.initArgs.processRequest(message);
            conn.send(response);
        });
    };
}
