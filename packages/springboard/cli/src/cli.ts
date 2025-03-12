import path from 'path';

import {program} from 'commander';
import concurrently from 'concurrently';

import packageJSON from '../package.json';

import {buildApplication, buildServer, platformBrowserBuildConfig, platformNodeBuildConfig, platformOfflineBrowserBuildConfig, platformPartykitBrowserBuildConfig, platformPartykitServerBuildConfig, platformTauriMaestroBuildConfig, platformTauriWebviewBuildConfig, SpringboardPlatform} from './build';
import {esbuildPluginTransformAwaitImportToRequire} from './esbuild_plugins/esbuild_plugin_transform_await_import';

program
    .name('sb')
    .description('Springboard CLI')
    .version(packageJSON.version);

program
    .command('dev')
    .description('Run the Springboard development server')
    .usage('sb dev src/index.tsx')
    .argument('entrypoint')
    .action(async (entrypoint: string) => {
        let applicationEntrypoint = entrypoint;

        const cwd = process.cwd();
        if (!path.isAbsolute(applicationEntrypoint)) {
            applicationEntrypoint = `${cwd}/${applicationEntrypoint}`;
        }

        applicationEntrypoint = path.resolve(applicationEntrypoint);

        await buildApplication(platformBrowserBuildConfig, {
            applicationEntrypoint,
            watch: true,
            dev: {
                reloadCss: true,
                reloadJs: true,
            },
        });

        await buildApplication(platformNodeBuildConfig, {
            applicationEntrypoint,
            watch: true,
        });

        await buildServer({
            watch: true,
        });

        const nodeArgs = '--watch --watch-preserve-output';

        await new Promise(r => setTimeout(r, 1000));

        concurrently(
            [
                {command: `node ${nodeArgs} dist/server/dist/local-server.cjs`, name: 'Server', prefixColor: 'blue'},
            ],
            {
                prefix: 'name',
                restartTries: 0,
            }
        );
    });

program
    .command('build')
    .description('Build the application bundles')
    .usage('sb build src/index.tsx')
    .argument('entrypoint')
    .option('-w, --watch', 'Watch for file changes')
    .option('-p, --platforms <PLATFORM>,<PLATFORM>', 'Platforms to build for')
    .action(async (entrypoint: string, options: {watch?: boolean, offline?: boolean, platforms?: string}) => {
        let platformToBuild = process.env.SPRINGBOARD_PLATFORM_VARIANT || options.platforms as SpringboardPlatform;
        if (!platformToBuild) {
            platformToBuild = 'main';
        }

        let applicationEntrypoint = entrypoint;

        const cwd = process.cwd();
        if (!path.isAbsolute(applicationEntrypoint)) {
            applicationEntrypoint = `${cwd}/${applicationEntrypoint}`;
        }

        applicationEntrypoint = path.resolve(applicationEntrypoint);

        console.log(`Building application variants "${platformToBuild}"`);

        const platformsToBuild = new Set<SpringboardPlatform>(platformToBuild.split(',') as SpringboardPlatform[]);

        if (
            platformsToBuild.has('all') ||
            platformsToBuild.has('main')
        ) {
            await buildApplication(platformBrowserBuildConfig, {
                applicationEntrypoint,
                watch: options.watch,
            });

            await buildApplication(platformNodeBuildConfig, {
                applicationEntrypoint,
                watch: options.watch,
            });

            await buildServer({
                watch: options.watch,
            });
        }

        if (
            platformsToBuild.has('all') ||
            platformsToBuild.has('browser_offline')
        ) {
            await buildApplication(platformOfflineBrowserBuildConfig, {
                applicationEntrypoint,
                watch: options.watch,
                esbuildOutDir: 'browser_offline',
            });
        }

        if (
            platformsToBuild.has('all') ||
            platformsToBuild.has('desktop')
        ) {
            await buildApplication(platformTauriWebviewBuildConfig, {
                applicationEntrypoint,
                watch: options.watch,
                esbuildOutDir: './tauri',
                editBuildOptions: (buildOptions) => {
                    buildOptions.define = {
                        ...buildOptions.define,
                        'process.env.DATA_HOST': "'http://127.0.0.1:1337'",
                        'process.env.WS_HOST': "'ws://127.0.0.1:1337'",
                        'process.env.RUN_SIDECAR_FROM_WEBVIEW': `${process.env.RUN_SIDECAR_FROM_WEBVIEW && process.env.RUN_SIDECAR_FROM_WEBVIEW !== 'false'}`,
                    };
                },
            });

            await buildApplication(platformTauriMaestroBuildConfig, {
                applicationEntrypoint,
                watch: options.watch,
                esbuildOutDir: './tauri',
            });

            await buildServer({
                watch: options.watch,
                applicationDistPath: `${cwd}/dist/tauri/node/dist/dynamic-entry.js`,
                esbuildOutDir: './tauri',
                editBuildOptions: (buildOptions) => {
                    buildOptions.plugins!.push(esbuildPluginTransformAwaitImportToRequire);
                }
            });
        }

        if (
            platformsToBuild.has('all') ||
            platformsToBuild.has('partykit')
        ) {
            await buildApplication(platformPartykitBrowserBuildConfig, {
                applicationEntrypoint,
                watch: options.watch,
                esbuildOutDir: 'partykit',
            });

            await buildApplication(platformPartykitServerBuildConfig, {
                applicationEntrypoint,
                watch: options.watch,
                esbuildOutDir: 'partykit',
            });
        }

        // if (
        //     platformsToBuild.has('all') ||
        //     platformsToBuild.has('mobile')
        // ) {
        //     await buildRNWebview();
        // }

        // if (
        //     platformsToBuild.has('all') ||
        //     platformsToBuild.has('browser_offline')
        // ) {
        //     await buildBrowserOffline();
        // }
    });

program
    .command('start')
    .description('Start the application server and node Maestro process')
    .usage('sb start')
    .action(async () => {
        concurrently(
            [
                {command: 'node dist/server/dist/local-server.cjs', name: 'Server', prefixColor: 'blue'},
                {command: 'node dist/node/dist/index.js', name: 'Node Maestro', prefixColor: 'green'},
            ],
            {
                prefix: 'name',
                restartTries: 0,
            }
        );
    });

program.parse();
