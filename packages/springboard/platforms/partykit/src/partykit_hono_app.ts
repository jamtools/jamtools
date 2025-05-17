import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {trpcServer} from '@hono/trpc-server';

import {NodeAppDependencies} from '@springboardjs/platforms-node/entrypoints/main';
import {NodeLocalJsonRpcClientAndServer} from '@springboardjs/platforms-node/services/node_local_json_rpc';

import {Springboard} from 'springboard/engine/engine';
import {makeMockCoreDependencies} from 'springboard/test/mock_core_dependencies';

import {RpcMiddleware, ServerModuleAPI, serverRegistry} from 'springboard-server/src/register';
import {PartykitJsonRpcServer} from './services/partykit_rpc_server';
import {PartykitTrpcRouter} from './entrypoints/partykit_server_entrypoint';
import {Room} from 'partykit/server';
import {PartykitKVStore} from './services/partykit_kv_store';

type InitAppReturnValue = {
    app: Hono;
    nodeAppDependencies: NodeAppDependencies;
    rpcService: PartykitJsonRpcServer;
};

type InitArgs = {
    kvTrpcRouter: PartykitTrpcRouter;
    room: Room;
}

export const initApp = (coreDeps: InitArgs): InitAppReturnValue => {
    const rpcMiddlewares: RpcMiddleware[] = [];

    const app = new Hono();

    app.use('*', cors());

    app.get('/', async c => {
        // TODO: implement per-party index.html here
        return new Response('Root route of the party! Welcome!');
    });

    app.use('/trpc/*', trpcServer({
        router: coreDeps.kvTrpcRouter,
    }));

    const rpc = new NodeLocalJsonRpcClientAndServer({
        broadcastMessage: (message) => {
            return rpcService.broadcastMessage(message);
        },
    });

    const rpcService = new PartykitJsonRpcServer({
        processRequest: async (message) => {
            return rpc!.processRequest(message);
        },
        rpcMiddlewares: [], // TODO: implement partykit middleware. maybe switch to using trpc for all actions and then that's not a problem
    }, coreDeps.room);

    const mockDeps = makeMockCoreDependencies({store: {}});

    const kvStore = new PartykitKVStore(coreDeps.room);

    let storedEngine: Springboard | undefined;

    const nodeAppDependencies: NodeAppDependencies = {
        rpc: {
            remote: rpc,
        },
        storage: {
            remote: kvStore,
            userAgent: mockDeps.storage.userAgent,
        },
        injectEngine: (engine) => {
            if (storedEngine) {
                throw new Error('Engine already injected');
            }

            storedEngine = engine;
        },
    };

    const makeServerModuleAPI = (): ServerModuleAPI => {
        return {
            hono: app,
            hooks: {
                registerRpcMiddleware: (cb) => {
                    rpcMiddlewares.push(cb);
                },
            },
            getEngine: () => storedEngine!,
        };
    };

    const registerServerModule: typeof serverRegistry['registerServerModule'] = (cb) => {
        cb(makeServerModuleAPI());
    };

    const registeredServerModuleCallbacks = (serverRegistry.registerServerModule as unknown as {calls: CapturedRegisterServerModuleCall[]}).calls || [];
    serverRegistry.registerServerModule = registerServerModule;

    for (const call of registeredServerModuleCallbacks) {
        call(makeServerModuleAPI());
    }

    return {app, nodeAppDependencies, rpcService};
};

type ServerModuleCallback = (server: ServerModuleAPI) => void;

type CapturedRegisterServerModuleCall = ServerModuleCallback;
