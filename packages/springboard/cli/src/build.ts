import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

import {esbuildPluginLogBuildTime} from './esbuild_plugins/esbuild_plugin_log_build_time';
import {esbuildPluginPlatformInject} from './esbuild_plugins/esbuild_plugin_platform_inject.js';

import {sassPlugin} from 'esbuild-sass-plugin';

type EsbuildOptions = Parameters<typeof esbuild.build>[0];

type BuildConfig = {
    platform: NonNullable<EsbuildOptions['platform']>;
    platformEntrypoint: () => string;
    esbuildPlugins?: () => any[];
    externals?: () => string[];
    additionalFiles?: Record<string, string>;
}

export const platformBrowserBuildConfig: BuildConfig = {
    platform: 'browser',
    platformEntrypoint: () => '@springboardjs/platforms-browser/entrypoints/index.tsx',
    esbuildPlugins: () => [
        esbuildPluginPlatformInject('browser'),
    ],
    additionalFiles: {
        '@springboardjs/platforms-browser/index.html': 'index.html',
    },
};

export const platformNodeBuildConfig: BuildConfig = {
    platform: 'node',
    platformEntrypoint: () => {
        let entrypoint = '@springboardjs/platforms-node/entrypoints/node_main_entrypoint.ts';
        if (process.env.DISABLE_IO === 'true') {
            entrypoint = '@springboardjs/platforms-node/entrypoints/node_saas_entrypoint.ts';
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
};

const shouldOutputMetaFile = process.argv.includes('--meta');

export type ApplicationBuildOptions = {
    editBuildOptions?: (options: EsbuildOptions) => void;
    esbuildOutDir?: string;
    applicationEntrypoint?: string;
    nodeModulesParentFolder?: string;
    watch?: boolean;
};

export const buildApplication = async (buildConfig: BuildConfig, options?: ApplicationBuildOptions) => {
    const coreFile = buildConfig.platformEntrypoint();

    const applicationEntrypoint = process.env.APPLICATION_ENTRYPOINT || options?.applicationEntrypoint;
    if (!applicationEntrypoint) {
        throw new Error('No application entrypoint provided');
    }

    const allImports = [coreFile, applicationEntrypoint].map(file => `import '${file}';`).join('\n');

    const parentOutDir = process.env.ESBUILD_OUT_DIR || options?.esbuildOutDir || './dist';
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
            sassPlugin(),
            ...(buildConfig.esbuildPlugins?.() || []),
        ],
        external: buildConfig.externals?.(),
        alias: {
            // 'springboard': './jamtools/packages/jamtools/core',
            // '@springboardjs/platforms-browser': './jamtools/packages/jamtools/platforms/webapp',
            // 'react': './node_modules/react',
            // 'jamtools-mantine': './jamtools/packages/springboard/mantine',
        },
        define: {
            'process.env.WS_HOST': `"${process.env.WS_HOST || ''}"`,
            'process.env.DATA_HOST': `"${process.env.DATA_HOST || ''}"`,
            'process.env.NODE_ENV': `"${process.env.NODE_ENV || ''}"`,
        },
    };

    options?.editBuildOptions?.(esbuildOptions);

    if (buildConfig.additionalFiles) {
        let nodeModulesParentFolder = process.env.NODE_MODULES_PARENT_FOLDER || options?.nodeModulesParentFolder;
        if (!nodeModulesParentFolder) {
            nodeModulesParentFolder = await findNodeModulesParentFolder();
        }
        if (!nodeModulesParentFolder) {
            throw new Error('Failed to find node_modules folder in current directory and parent directories')
        }

        for (const srcFileName of Object.keys(buildConfig.additionalFiles)) {
            const destFileName = buildConfig.additionalFiles[srcFileName];

            const fullSrcFilePath = path.join(nodeModulesParentFolder, 'node_modules', srcFileName);
            const fullDestFilePath = `${outDir}/${destFileName}`;
            await fs.promises.copyFile(fullSrcFilePath, fullDestFilePath);
        }
    }

    if (options?.watch) {
        const ctx = await esbuild.context(esbuildOptions);
        await ctx.watch();
        console.log(`Watching for changes for ${buildConfig.platform} application build...`);
        return;
    }

    const result = await esbuild.build(esbuildOptions);
    if (shouldOutputMetaFile) {
        await fs.promises.writeFile('esbuild_meta.json', JSON.stringify(result.metafile));
    }
};

export type ServerBuildOptions = {
    esbuildOutDir?: string;
    serverEntrypoint?: string;
    watch?: boolean;
};

export const buildServer = async (options?: ServerBuildOptions) => {
    const externals = ['better-sqlite3'];

    const parentOutDir = process.env.ESBUILD_OUT_DIR || options?.esbuildOutDir || './dist';
    const outDir = `${parentOutDir}/server/dist`;

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, {recursive: true});
    }

    const outFile = path.join(outDir, 'local-server.cjs');

    const coreFile = 'springboard-server/src/entrypoints/local-server.entrypoint.ts';
    const serverEntrypoint = process.env.SERVER_ENTRYPOINT || options?.serverEntrypoint;

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

    if (options?.watch) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching for changes for server build...');
    } else {
        await esbuild.build(buildOptions);
    }
};

const findNodeModulesParentFolder = async () => {
    let currentDir = process.cwd();

    while (true) {
        try {
            const nodeModulesPath = path.join(currentDir, 'node_modules');
            const stats = await fs.promises.stat(nodeModulesPath);

            if (stats.isDirectory()) {
                return currentDir;
            }
        } catch (error) {
            const parentDir = path.dirname(currentDir);

            if (parentDir === currentDir) {
                break;
            }

            currentDir = parentDir;
        }
    }

    return undefined;
};
