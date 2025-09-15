import springboard from 'springboard';
import { makeMockCoreDependencies } from 'springboard/test/mock_core_dependencies';
import { Springboard } from 'springboard/engine/engine';
import { initApp } from '../partykit_hono_app';
export default class Server {
    constructor(room) {
        this.room = room;
        this.kv = {};
        this.makeKvStoreForHttp = () => {
            return {
                get: async (key) => {
                    const value = this.kv[key];
                    if (!value) {
                        return null;
                    }
                    return JSON.parse(value);
                },
                getAll: async () => {
                    const allEntriesAsRecord = {};
                    for (const key of Object.keys(this.kv)) {
                        allEntriesAsRecord[key] = JSON.parse(this.kv[key]);
                    }
                    return allEntriesAsRecord;
                },
                set: async (key, value) => {
                    this.kv[key] = JSON.stringify(value);
                },
            };
        };
        const { app, nodeAppDependencies, rpcService } = initApp({
            kvForHttp: this.makeKvStoreForHttp(),
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
            this.kv[key] = value;
        }
        this.springboardApp = await startSpringboardApp(this.nodeAppDependencies);
    }
    static onFetch(req, lobby, ctx) {
        return lobby.assets.fetch('/dist/index.html');
    }
    async onRequest(req) {
        // this.room.context.assets.fetch('/dist/parties/tic-tac-toe/index.html'); // TODO: this should have js pointers in it, fingerprinted and ready to go to be served by partykit
        const urlParts = new URL(req.url).pathname.split('/');
        const partyName = urlParts[2];
        const roomName = urlParts[3];
        const prefixToRemove = `/parties/${partyName}/${roomName}`;
        const newUrl = req.url.replace(prefixToRemove, '');
        const pathname = new URL(newUrl).pathname;
        if (pathname === '' || pathname === '/') {
            return (await this.room.context.assets.fetch('/dist/index.html'));
        }
        const newReq = new Request(newUrl, req);
        return this.app.fetch(newReq);
    }
    async onMessage(message, sender) {
        await this.rpcService.onMessage(message, sender);
    }
}
export const startSpringboardApp = async (deps) => {
    const mockDeps = makeMockCoreDependencies({ store: {} });
    const coreDeps = {
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
