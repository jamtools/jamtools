import {DurableObject} from "cloudflare:workers";

import {CoreDependencies, KVStore} from 'springboard/types/module_types';
import {initApp} from '../../../server/src/hono_app';

import crosswsCf, {CloudflareDurableAdapter} from 'crossws/adapters/cloudflare';
import {Springboard} from 'springboard/engine/engine';
import springboard from 'springboard';
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

export default {
    async fetch(request, env, ctx): Promise<Response> {
        springboard.reset();

        const mockDeps = makeMockCoreDependencies({store: {}});
        const remoteKV = mockDeps.storage.remote;
        const userAgentKV = mockDeps.storage.userAgent;

        const {app, serverAppDependencies} = initApp({
            broadcastMessage: (message) => {
                return ws.publish('event', message);
            },
            remoteKV,
            userAgentKV,
            serveStaticFile: async (c, fileName, headers) => {
                const url = new URL(c.req.url);
                if (url.pathname.startsWith('/dist')) {
                    url.pathname = url.pathname.replace('/dist', '');
                }

                const response = await env.ASSETS.fetch(url.toString());

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
                const value = (env as unknown as Record<string, unknown>)[name];
                if (typeof value === 'string') {
                    return value;
                }

                return undefined;
            },
        });

        const {pathname} = new URL(request.url)

        const coreDeps: CoreDependencies = {
            log: console.log,
            showError: console.error,
            storage: serverAppDependencies.storage,
            isMaestro: () => true,
            rpc: serverAppDependencies.rpc,
        };

        const engine = new Springboard(coreDeps, {});

        await engine.initialize();

        serverAppDependencies.injectEngine(engine);

        if (request.headers.get('upgrade') === 'websocket' && pathname === '/ws') {
            return ws.handleUpgrade(request, env, ctx)
        }

        return app.fetch(request, env, ctx);
    },
} satisfies ExportedHandler<Env>;

export class $DurableObject extends DurableObject {
    constructor(state, env) {
        super(state, env);
        ws.handleDurableInit(this, state, env);
    }

    fetch(request) {
        return ws.handleDurableUpgrade(this, request);
    }

    webSocketMessage(client, message) {
        return ws.handleDurableMessage(this, client, message);
    }

    webSocketPublish(topic, message, opts) {
        return ws.handleDurablePublish(this, topic, message, opts);
    }

    webSocketClose(client, code, reason, wasClean) {
        return ws.handleDurableClose(this, client, code, reason, wasClean);
    }
}
