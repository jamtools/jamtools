import path from 'path';

import {program} from 'commander';
import concurrently from 'concurrently';

import packageJSON from '../package.json';

import {buildApplication, buildServer, platformBrowserBuildConfig, platformNodeBuildConfig} from './build';

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
                {command: `node ${nodeArgs} dist/node/dist/index.js`, name: 'Node Maestro', prefixColor: 'green'},
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
    .action(async (entrypoint: string, options: {watch?: boolean}) => {
        let applicationEntrypoint = entrypoint;

        const cwd = process.cwd();
        if (!path.isAbsolute(applicationEntrypoint)) {
            applicationEntrypoint = `${cwd}/${applicationEntrypoint}`;
        }

        applicationEntrypoint = path.resolve(applicationEntrypoint);

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
