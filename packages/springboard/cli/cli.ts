import {buildApplication, buildServer, platformBrowserBuildConfig, platformNodeBuildConfig} from './esbuild';

const main = async () => {
    const buildConfigs = [
        platformBrowserBuildConfig,
        platformNodeBuildConfig,
    ];

    for (const buildConfig of buildConfigs) {
        await buildApplication(buildConfig);
    }

    await buildServer();
};

setTimeout(main);

process.on('SIGINT', () => {
    process.exit(0);
});
