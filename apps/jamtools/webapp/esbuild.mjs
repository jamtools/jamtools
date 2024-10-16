import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from '../../../configs/esbuild_plugins/esbuild_plugin_log_build_time.js';

const watchForChanges = process.argv.includes('--watch');

const buildToolDir = process.env.BUILD_TOOL_DIR || '../..';
const coreFile = path.join(buildToolDir, './webapp/src/index.tsx');

const moduleIndexFile = process.env.MODULES_INDEX_FILE || '../../modules/index.ts';

const allImports = [moduleIndexFile, coreFile].map(file => `import '${file}';`).join('\n');

const outDir = process.env.ESBUILD_OUT_DIR || './dist';
const dynamicEntryPath = path.join(outDir, 'dynamic-entry.js');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true});
}

fs.writeFileSync(dynamicEntryPath, allImports);

const outFile = path.join(outDir, 'index.js');

async function build() {
    const buildOptions = {
        entryPoints: [dynamicEntryPath],
        bundle: true,
        sourcemap: true,
        outfile: outFile,
        platform: 'browser',
        minify: process.env.NODE_ENV === 'production',
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
