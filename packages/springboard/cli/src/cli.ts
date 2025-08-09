import path from 'path';
import fs from 'node:fs';

import {Option, program} from 'commander';
import concurrently from 'concurrently';

import packageJSON from '../package.json';

import {buildApplication, platformBrowserBuildConfig, platformNodeBuildConfig, platformNodeServerBuildConfig, platformOfflineBrowserBuildConfig, platformPartykitBrowserBuildConfig, platformPartykitServerBuildConfig, platformTauriMaestroBuildConfig, platformTauriWebviewBuildConfig, SpringboardPlatform} from './build';
import {esbuildPluginTransformAwaitImportToRequire} from './esbuild_plugins/esbuild_plugin_transform_await_import';

program
    .name('sb')
    .description('Springboard CLI')
    .version(packageJSON.version);

program
    .command('dev')
    .description('Run the Springboard development server')
    .usage('src/index.tsx')
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

        await buildApplication(platformNodeServerBuildConfig, {
            watch: true,
            esbuildOutDir: 'server',
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
    .usage('src/index.tsx')
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

            await buildApplication(platformNodeServerBuildConfig, {
                watch: options.watch,
                esbuildOutDir: 'server',
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

            await buildApplication(platformNodeServerBuildConfig, {
                watch: options.watch,
                esbuildOutDir: 'tauri/server',
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
    .description('Start the application server')
    .usage('')
    .action(async () => {
        concurrently(
            [
                {command: 'node dist/server/dist/local-server.cjs', name: 'Server', prefixColor: 'blue'},
                // {command: 'node dist/node/dist/index.js', name: 'Node Maestro', prefixColor: 'green'},
            ],
            {
                prefix: 'name',
                restartTries: 0,
            }
        );
    });

// import { readJsonSync, writeJsonSync } from 'fs-extra';
import { resolve } from 'path';
// import {generateReactNativeProject} from './generators/mobile/react_native_project_generator';

program
    .command('upgrade')
    .description('Upgrade package versions with a specified prefix in package.json files.')
    .usage('')
    .argument('<new-version>', 'The new version number to set for matching packages.')
    .option('--packages <files...>', 'package.json files to update', ['package.json'])
    .option('--prefixes <prefixes...>', 'Package name prefixes to match (can be comma-separated or repeated)', ['springboard', '@springboardjs/', '@jamtools/'])
    .addOption(new Option('--publish <tag>').hideHelp())
    .action(async (newVersion, options) => {
    const { packages, prefixes, publish } = options;

    console.log('publishing to ' + publish);
    // return;

    const normalizedPrefixes = (prefixes as string[]).flatMap((p) => p.split(',')).map((p) => p.trim());

    for (const packageFile of packages) {
      const packagePath = resolve(process.cwd(), packageFile);
      try {
        const packageJson = JSON.parse(fs.readFileSync(packagePath).toString());
        let modified = false;

        for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
          if (!packageJson[depType]) continue;

          for (const [dep, currentVersion] of Object.entries<string>(packageJson[depType])) {
            console.log(normalizedPrefixes, dep)
            if (normalizedPrefixes.some((prefix) => dep.startsWith(prefix))) {
              packageJson[depType][dep] = newVersion;
              console.log(`✅ Updated ${dep} to ${newVersion} in ${packageFile}`);
              modified = true;
            }
          }
        }

        if (modified) {
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        } else {
          console.log(`ℹ️ No matching packages found in ${packageFile}`);
        }
      } catch (err) {
        console.error(`❌ Error processing ${packageFile}:`, err);
      }
    }
});

// const generateCommand = program.command('generate');

// generateCommand.command('mobile')
//     .description('Generate a mobile app')
//     .action(async () => {
//         await generateReactNativeProject();
//     });


if (!(globalThis as any).AVOID_PROGRAM_PARSE) {
    program.parse();
}
