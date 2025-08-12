import {DurableObject} from "cloudflare:workers";

import {CoreDependencies, KVStore} from 'springboard/types/module_types';
import {initApp} from '../../../server/src/hono_app';

import crosswsCf, {CloudflareDurableAdapter} from 'crossws/adapters/cloudflare';
import {Springboard} from 'springboard/engine/engine';
import {makeMockCoreDependencies} from 'springboard/test/mock_core_dependencies';

const ws = crosswsCf({
    hooks: {
        open: peer => {
            // console.log(`new peer ${peer.id}`)
            peer.subscribe('event');
        },
        close: peer => {
            // console.log(`closed peer ${peer.id}`)
            peer.unsubscribe('event');
        },
    }
});

const mockDeps = makeMockCoreDependencies({store: {}});
const remoteKV = mockDeps.storage.remote;
const userAgentKV = mockDeps.storage.userAgent;

const {app, serverAppDependencies, injectResources} = initApp({
    broadcastMessage: (message) => {
        return ws.publish('event', message);
    },
    remoteKV,
    userAgentKV,
});

const coreDeps: CoreDependencies = {
    log: console.log,
    showError: console.error,
    storage: serverAppDependencies.storage,
    isMaestro: () => true,
    rpc: serverAppDependencies.rpc,
};

const engine = new Springboard(coreDeps, {});

let storedEnv: Env;

const initializeWithResources = async (environment: Env) => {
    storedEnv = environment;

    injectResources({
        engine,
        serveStaticFile: async (c, fileName, headers) => {
            const url = new URL(c.req.url);
            if (url.pathname.startsWith('/dist')) {
                url.pathname = url.pathname.replace('/dist', '');
            }

            const response = await storedEnv.ASSETS.fetch(url.toString());

            if (headers && Object.keys(headers).length > 0) {
                const newResponse = new Response(response.body, response);

                Object.entries(headers).forEach(([key, value]) => {
                    newResponse.headers.set(key, value);
                });

                return newResponse;
            }

            return response;
        },
        getEnvValue: name => {
            const value = (storedEnv as unknown as Record<string, unknown>)[name];
            if (typeof value === 'string') {
                return value;
            }

            return undefined;
        },
    });

    // @ts-ignore
    await engine.initialize();
};

let initialized = false;

export default {
    async fetch(request, env, ctx): Promise<Response> {
        if (!initialized) {
            await initializeWithResources(env);
            initialized = true;
        }

        const {pathname} = new URL(request.url)

        if (request.headers.get('upgrade') === 'websocket' && pathname === '/ws') {
            return ws.handleUpgrade(request, env, ctx)
        }

        return app.fetch(request, env, ctx);
    },
} satisfies ExportedHandler<Env>;

export class $DurableObject extends DurableObject {
    // @ts-ignore
    constructor(state, env) {
        super(state, env);
        ws.handleDurableInit(this, state, env);
    }

    // @ts-ignore
    fetch(request) {
        return ws.handleDurableUpgrade(this, request);
    }

    // @ts-ignore
    webSocketMessage(client, message) {
        return ws.handleDurableMessage(this, client, message);
    }

    // @ts-ignore
    webSocketPublish(topic, message, opts) {
        return ws.handleDurablePublish(this, topic, message, opts);
    }

    // @ts-ignore
    webSocketClose(client, code, reason, wasClean) {
        return ws.handleDurableClose(this, client, code, reason, wasClean);
    }
}
