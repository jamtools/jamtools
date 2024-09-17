import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from '../../../configs/esbuild_plugins/esbuild_plugin_log_build_time.js';

let entrypoint = './src/entrypoints/node_main_entrypoint.ts';
let externals = ['@julusian/midi', 'easymidi'];

if (process.env.DISABLE_IO === 'true') {
    entrypoint = './src/entrypoints/node_saas_entrypoint.ts';
    externals = [];
}

async function build() {
    const buildOptions = {
        entryPoints: [entrypoint],
        bundle: true,
        sourcemap: true,
        outfile: './dist/local-server.js',
        platform: 'node',
        plugins: [
            esbuildPluginLogBuildTime(),
        ],
        external: externals,
        define: {
            'process.env.WS_HOST': `"${process.env.WS_HOST || ''}"`,
            'process.env.DATA_HOST': `"${process.env.DATA_HOST || ''}"`,
        },
        // esbuild src/index.ts --outfile=dist/local-server.js --bundle --sourcemap --platform=node --external:@julusian/midi --external:easymidi --define:process.env.WS_HOST=\"'$WS_HOST'\" --define:process.env.DISABLE_IO=\"'$DISABLE_IO'\"
    };

    if (process.env.WATCH_FOR_CHANGES === 'true') {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching for changes...');
    } else {
        await esbuild.build(buildOptions);
    }
}

build().catch(() => process.exit(1));
