import type * as Party from 'partykit/server';

import {Hono} from 'hono';

import {initTRPC} from '@trpc/server';
import {z} from 'zod';

import springboard from 'springboard';
import type {NodeAppDependencies} from '@springboardjs/platforms-node/entrypoints/main';
import {makeMockCoreDependencies} from 'springboard/test/mock_core_dependencies';
import {Springboard} from 'springboard/engine/engine';
import {CoreDependencies} from 'springboard/types/module_types';

import {initApp} from '../partykit_hono_app';

import {PartykitJsonRpcServer} from '../services/partykit_rpc_server';

export default class Server implements Party.Server {
    private app: Hono;
    private nodeAppDependencies: NodeAppDependencies;
    private springboardApp!: Springboard;
    private rpcService: PartykitJsonRpcServer;

    private kv: Record<string, string> = {};

    constructor(readonly room: Party.Room) {
        const {app, nodeAppDependencies, rpcService} = initApp({
            kvTrpcRouter: this.makeTrpcRouter(),
            room,
        });

        this.app = app;
        this.nodeAppDependencies = nodeAppDependencies;
        this.rpcService = rpcService;
    }

    async onStart() {
        springboard.reset();
        const values = await this.room.storage.list({
            limit: 100,
        });

        for (const [key, value] of values) {
            this.kv[key] = value as string;
        }

        this.springboardApp = await startSpringboardApp(this.nodeAppDependencies);
    }

    static onFetch(req: Party.Request, lobby: Party.FetchLobby, ctx: Party.ExecutionContext) {
        return lobby.assets.fetch('/dist/index.html');
    }

    async onRequest(req: Party.Request) {
        // this.room.context.assets.fetch('/dist/parties/tic-tac-toe/index.html'); // TODO: this should have js pointers in it, fingerprinted and ready to go to be served by partykit

        const urlParts = new URL(req.url).pathname.split('/');
        const partyName = urlParts[2];
        const roomName = urlParts[3];

        const prefixToRemove = `/parties/${partyName}/${roomName}`;
        const newUrl = req.url.replace(prefixToRemove, '');

        const pathname = new URL(newUrl).pathname;

        if (pathname === '' || pathname === '/') {
            return (await this.room.context.assets.fetch('/dist/index.html'))!;
        }

        const newReq = new Request(newUrl, req as any);
        return this.app.fetch(newReq);
    }

    async onMessage(message: string, sender: Party.Connection) {
        await this.rpcService.onMessage(message, sender);
    }

    private makeTrpcRouter = () => {
        const t = initTRPC.context().create();

        const trpcRouter = t.router({
            kvGet: t.procedure
                .input(z.object({
                    key: z.string(),
                }))
                .query(async (opts) => {
                    return this.kv[opts.input.key] as string | undefined;
                }),
            kvGetAll: t.procedure
                .query(async () => {
                    const entries = Object.entries(this.kv).map(args => ({key: args[0], value: args[1]}));
                    return entries;
                }),
            kvPut: t.procedure
                .input(z.object({
                    key: z.string(),
                    value: z.string(),
                }))
                .mutation(async (opts) => {
                    return {error: 'kvPut operation not supported on this platform'}
                }),

        });

        return trpcRouter;
    };
}

export type PartykitTrpcRouter = ReturnType<Server['makeTrpcRouter']>;

export const startSpringboardApp = async (deps: NodeAppDependencies): Promise<Springboard> => {
    const mockDeps = makeMockCoreDependencies({store: {}});
    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: console.error,
        storage: deps.storage,
        files: mockDeps.files,
        isMaestro: () => true,
        rpc: deps.rpc,
    };

    Object.assign(coreDeps, deps);
    const engine = new Springboard(coreDeps, {});

    await engine.initialize();
    deps.injectEngine(engine);
    return engine;
};
