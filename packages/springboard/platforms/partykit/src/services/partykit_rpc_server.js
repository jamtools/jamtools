// TODO: make this an arbitrary store instead of specifically this one
import { nodeRpcAsyncLocalStorage } from '@springboardjs/platforms-node/services/node_rpc_async_local_storage';
export class PartykitJsonRpcServer {
    constructor(initArgs, room) {
        this.initArgs = initArgs;
        this.room = room;
        this.broadcastMessage = (message) => {
            this.room.broadcast(message);
        };
        this.onMessage = async (message, conn) => {
            // we switched to using http for rpc, so this is no longer used
        };
        this.processRequestWithMiddleware = async (message, c) => {
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
            const rpcContext = {};
            for (const middleware of this.initArgs.rpcMiddlewares) {
                try {
                    const middlewareResult = await middleware(c);
                    Object.assign(rpcContext, middlewareResult);
                }
                catch (e) {
                    console.error('Error with rpc middleware', e);
                    return JSON.stringify({
                        jsonrpc: '2.0',
                        id: jsonMessage.id,
                        error: 'An error occurred',
                    });
                }
            }
            return new Promise((resolve) => {
                nodeRpcAsyncLocalStorage.run(rpcContext, async () => {
                    const response = await this.initArgs.processRequest(message);
                    resolve(response);
                });
            });
        };
    }
}
