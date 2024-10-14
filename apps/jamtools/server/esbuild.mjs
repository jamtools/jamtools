import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from '../../../configs/esbuild_plugins/esbuild_plugin_log_build_time.js';

const watchForChanges = process.argv.includes('--watch');

const externals = ['better-sqlite3'];

const outDir = process.env.ESBUILD_OUT_DIR || './dist';
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true});
}

const outFile = path.join(outDir, 'local-server.js');

async function build() {
    const buildOptions = {
        entryPoints: ['./src/entrypoints/local-server.entrypoint.ts'],
        bundle: true,
        sourcemap: true,
        outfile: outFile,
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
