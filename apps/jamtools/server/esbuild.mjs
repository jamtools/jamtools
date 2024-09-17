import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from '../../../configs/esbuild_plugins/esbuild_plugin_log_build_time.js';

const watchForChanges = process.argv.includes('--watch');

const externals = ['better-sqlite3'];

async function build() {
    const buildOptions = {
        entryPoints: ['./src/entrypoints/local-server.entrypoint.ts'],
        bundle: true,
        sourcemap: true,
        outfile: './dist/local-server.js',
        platform: 'node',
        plugins: [
            esbuildPluginLogBuildTime(),
        ],
        external: externals,
    };

    if (watchForChanges) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching for changes...');
    } else {
        await esbuild.build(buildOptions);
    }
}

build().catch(() => process.exit(1));
