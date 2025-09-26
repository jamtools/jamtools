import path from 'path';

import concurrently from 'concurrently';

import { buildApplicationWithVite, platformBrowserBuildConfig, platformNodeBuildConfig } from 'springboard-cli/src/build';

const applicationEntrypoint = path.join(process.cwd(), 'tic_tac_toe/tic_tac_toe.tsx');

const watch = true;

async function run() {
    const awaitIfNotWatch = async (promise: Promise<unknown>) => {
        if (!watch) {
            await promise;
        }
    };

    try {
        console.log('Starting test build with Vite...');
        await awaitIfNotWatch(buildApplicationWithVite(platformBrowserBuildConfig, {
            applicationEntrypoint,
            name: 'test-app',
            watch,
        }));

        await awaitIfNotWatch(buildApplicationWithVite(platformNodeBuildConfig, {
            applicationEntrypoint,
            name: 'test-app',
            watch,
            esbuildOutDir: 'vite-server',
        }));

        if (watch) {
            const nodeArgs = '--watch --watch-preserve-output';

            await new Promise(r => setTimeout(r, 1000));

            concurrently(
                [
                    {command: `node ${nodeArgs} dist/server/dist/local-server.cjs`, name: 'Server', prefixColor: 'blue'},
                ],
                {
                    prefix: 'name',
                    restartTries: 0,
                },
            );
        }

        console.log('Test build completed successfully!');
    } catch (error) {
        console.error('Test build failed:', error);
        process.exit(1);
    }
}

run();
