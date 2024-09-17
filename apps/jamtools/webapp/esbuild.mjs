import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from '../../../configs/esbuild_plugins/esbuild_plugin_log_build_time.js';

const watchForChanges = process.argv.includes('--watch');

async function build() {
    const buildOptions = {
        entryPoints: ['./src/index.tsx'],
        bundle: true,
        sourcemap: 'inline',
        outfile: './dist/index.js',
        platform: 'browser',
        target: 'es6',
        plugins: [
            esbuildPluginLogBuildTime(),
        ],
        define: {
            'process.env.WS_HOST': `"${process.env.WS_HOST || ''}"`,
            'process.env.DATA_HOST': `"${process.env.DATA_HOST || ''}"`,
        },
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
