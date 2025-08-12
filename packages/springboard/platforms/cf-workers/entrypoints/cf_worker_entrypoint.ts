import {KVStore} from 'springboard/types/module_types';
import {initApp} from '../../../server/src/hono_app';

import crosswsCf, {CloudflareDurableAdapter} from 'crossws/adapters/cloudflare';


export default {
	async fetch(request, env, ctx): Promise<Response> {
        const remoteKV: KVStore = {} as any;
        const userAgentKV: KVStore = {} as any;

		const {app, serverAppDependencies, wsAdapterInstance} = initApp({
            crossWsAdapter: hooks => crosswsCf({hooks}),
            remoteKV,
            userAgentKV,
            serveStaticFile: async (c, fileName, headers) => {
                const response = await env.ASSETS.fetch(fileName, {});

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

        return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
