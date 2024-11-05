const logSuccessfulBuild = () => {
    console.log('\x1b[32m%s\x1b[0m', 'Build errors have been solved :)');
}

export const esbuildPluginLogBuildTime = () => ({
    name: 'log-build-time',
    setup(build: any) {
        let startTime = 0;
        let hadError = false;
        build.onStart(() => {
            startTime = Date.now();
        });
        build.onEnd((result: any) => {
            if (result.errors.length) {
                hadError = true;
                return;
            }

            if (hadError) {
                logSuccessfulBuild();
            }

            hadError = false;

            console.log(`Build finished in ${Date.now() - startTime}ms`);
        });
    },
});
