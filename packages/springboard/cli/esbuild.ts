import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from './esbuild_plugins/esbuild_plugin_log_build_time';
import {esbuildPluginPlatformInject} from './esbuild_plugins/esbuild_plugin_platform_inject.js';

type EsbuildOptions = Parameters<typeof esbuild.build>[0];

type BuildConfig = {
    platform: NonNullable<EsbuildOptions['platform']>;
    platformEntrypoint: () => string;
    esbuildPlugins?: () => any[];
    externals?: () => string[];
    additionalFiles?: Record<string, string>;
}

const main = async () => {
    for (const buildConfig of buildConfigs) {
        await buildApplication(buildConfig);
    }

    await buildServer();
};

const buildConfigs: BuildConfig[] = [
    {
        platform: 'node',
        platformEntrypoint: () => {
            let entrypoint = 'jamtools-platforms-node/entrypoints/node_main_entrypoint.ts';
            if (process.env.DISABLE_IO === 'true') {
                entrypoint = 'jamtools-platforms-node/entrypoints/node_saas_entrypoint.ts';
            }

            return entrypoint;
        },
        esbuildPlugins: () => [
            esbuildPluginPlatformInject('node'),
        ],
        externals: () => {
            let externals = ['@julusian/midi', 'easymidi', 'jsdom'];
            if (process.env.DISABLE_IO === 'true') {
                externals = ['jsdom'];
            }

            return externals;
        },
    },
    {
        platform: 'browser',
        platformEntrypoint: () => 'jamtools-platforms-webapp/entrypoints/index.tsx',
        esbuildPlugins: () => [
            esbuildPluginPlatformInject('browser'),
        ],
        additionalFiles: {
            'jamtools-platforms-webapp/index.html': 'index.html',
        },
    },
];

const watchForChanges = process.argv.includes('--watch');
const shouldOutputMetaFile = process.argv.includes('--meta');

const buildApplication = async (buildConfig: BuildConfig) => {
    const coreFile = buildConfig.platformEntrypoint();

    const applicationEntrypoint = process.env.APPLICATION_ENTRYPOINT || '../../../../../../apps/jamtools/modules/index.ts';

    const allImports = [coreFile, applicationEntrypoint].map(file => `import '${file}';`).join('\n');

    const parentOutDir = process.env.ESBUILD_OUT_DIR || './dist';
    const outDir = `${parentOutDir}/${buildConfig.platform}/dist`;

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, {recursive: true});
    }

    const dynamicEntryPath = path.join(outDir, 'dynamic-entry.js');
    fs.writeFileSync(dynamicEntryPath, allImports);

    const outFile = path.join(outDir, 'index.js');

    const esbuildOptions: EsbuildOptions = {
        entryPoints: [dynamicEntryPath],
        metafile: shouldOutputMetaFile,
        bundle: true,
        sourcemap: true,
        outfile: outFile,
        platform: buildConfig.platform,
        minify: process.env.NODE_ENV === 'production',
        target: 'es6',
        plugins: [
            esbuildPluginLogBuildTime(buildConfig.platform),
            ...(buildConfig.esbuildPlugins?.() || []),
        ],
        external: buildConfig.externals?.(),
        alias: {
            // 'jamtools-core': './jamtools/packages/jamtools/core',
            // 'jamtools-platforms-webapp': './jamtools/packages/jamtools/platforms/webapp',
            // 'react': './node_modules/react',
            // 'jamtools-mantine': './jamtools/packages/springboard/mantine',
        },
        define: {
            'process.env.WS_HOST': `"${process.env.WS_HOST || ''}"`,
            'process.env.DATA_HOST': `"${process.env.DATA_HOST || ''}"`,
            'process.env.NODE_ENV': `"${process.env.NODE_ENV || ''}"`,
        },
    };

    if (watchForChanges) {
        const ctx = await esbuild.context(esbuildOptions);
        await ctx.watch();
        console.log('Watching for changes...');
        return;
    }

    const result = await esbuild.build(esbuildOptions);
    if (shouldOutputMetaFile) {
        await fs.promises.writeFile('esbuild_meta.json', JSON.stringify(result.metafile));
    }

    if (buildConfig.additionalFiles) {
        const nodeModulesParentFolder = process.env.NODE_MODULES_PARENT_FOLDER || '.';

        for (const srcFileName of Object.keys(buildConfig.additionalFiles)) {
            const destFileName = buildConfig.additionalFiles[srcFileName];

            const fullSrcFilePath = path.join(nodeModulesParentFolder, 'node_modules', srcFileName);

            const fullDestFilePath = `${outDir}/${destFileName}`
            await fs.promises.copyFile(fullSrcFilePath, fullDestFilePath);
        }
    }
};

const buildServer = async () => {
    const externals = ['better-sqlite3'];

    const parentOutDir = process.env.ESBUILD_OUT_DIR || './dist';
    const outDir = `${parentOutDir}/server/dist`;

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, {recursive: true});
    }

    const outFile = path.join(outDir, 'local-server.cjs');

    const coreFile = 'jamtools-server/src/entrypoints/local-server.entrypoint.ts';
    const serverEntrypoint = process.env.SERVER_ENTRYPOINT;

    let allImports = [coreFile].map(file => `import '${file}';`).join('\n');
    if (serverEntrypoint) {
        allImports = [coreFile, serverEntrypoint].map(file => `import '${file}';`).join('\n');
    }

    const dynamicEntryPath = path.join(outDir, 'dynamic-entry.js');
    fs.writeFileSync(dynamicEntryPath, allImports);

    const buildOptions: EsbuildOptions = {
        entryPoints: [dynamicEntryPath],
        bundle: true,
        sourcemap: true,
        outfile: outFile,
        platform: 'node',
        minify: process.env.NODE_ENV === 'production',
        plugins: [
            esbuildPluginLogBuildTime('server'),
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
};

setTimeout(main);

process.on('SIGINT', () => {
    process.exit(0);
});
