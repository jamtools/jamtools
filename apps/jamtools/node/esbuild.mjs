import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from './esbuild_plugins/esbuild_plugin_log_build_time.js';
import {esbuildPluginPlatformInject} from './esbuild_plugins/esbuild_plugin_platform_inject.mjs';

let entrypoint = 'entrypoints/node_main_entrypoint.ts';
let externals = ['@julusian/midi', 'easymidi', 'jsdom'];

if (process.env.DISABLE_IO === 'true') {
    entrypoint = 'entrypoints/node_saas_entrypoint.ts';
    externals = ['jsdom'];
}

const buildToolDir = process.env.BUILD_TOOL_DIR || '../..';
// const coreFile = path.join(buildToolDir, './node/src', entrypoint);
const coreFile = `jamtools-node/src/${entrypoint}`;

const watchForChanges = process.argv.includes('--watch');

const moduleIndexFile = process.env.MODULES_INDEX_FILE || '../../modules/index.ts';

const outDir = process.env.ESBUILD_OUT_DIR || './dist';
const dynamicEntryPath = path.join(outDir, 'dynamic-entry.js');

const allImports = [coreFile, moduleIndexFile].map(file => `import '${file}';`).join('\n');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true});
}

fs.writeFileSync(dynamicEntryPath, allImports);

const outFile = path.join(outDir, 'local-server.js');

async function build() {
    const buildOptions = {
        entryPoints: [dynamicEntryPath],
        metafile: true,
        bundle: true,
        minify: process.env.NODE_ENV === '"production"',
        sourcemap: true,
        outfile: outFile,
        platform: 'node',
        target: 'es6',
        plugins: [
            esbuildPluginLogBuildTime(),
            esbuildPluginPlatformInject('node'),
        ],
        external: externals,
        define: {
            'process.env.WS_HOST': `"${process.env.WS_HOST || ''}"`,
            'process.env.DATA_HOST': `"${process.env.DATA_HOST || ''}"`,
            'process.env.NODE_ENV': `"${process.env.NODE_ENV || ''}"`,
        },
    };

    if (watchForChanges) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching for changes...');
    } else {
        return esbuild.build(buildOptions);
    }
}

build().then(async m => {
    await fs.promises.writeFile('esbuild_meta.json', JSON.stringify(m.metafile));
}).catch(() => process.exit(1));
