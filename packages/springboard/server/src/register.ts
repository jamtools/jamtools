import type {Context, Hono} from 'hono';

export type ServerModuleAPI = {
    hono: Hono;
    hooks: ServerHooks;
}

export type ServerModuleCallback = (server: ServerModuleAPI) => void;

type CapturedRegisterServerModuleCall = ServerModuleCallback;

const registerServerModule = (
    cb: ServerModuleCallback,
) => {
    const calls = (registerServerModule as unknown as {calls: CapturedRegisterServerModuleCall[]}).calls || [];
    calls.push(cb);
    (registerServerModule as unknown as {calls: CapturedRegisterServerModuleCall[]}).calls = calls;
};

export type ServerModuleRegistry = {
    registerServerModule: (
        cb: ServerModuleCallback,
    ) => void;
}

export const serverRegistry: ServerModuleRegistry = {
    registerServerModule,
};

export type RpcMiddleware = (c: Context) => Promise<object>;

type ServerHooks = {
    registerRpcMiddleware: (cb: RpcMiddleware) => void;
};
