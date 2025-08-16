import fs from 'node:fs/promises';

import type { Plugin as SpringboardPlugin } from 'springboard-cli/src/build';

import esbuildSvelte from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import preprocessReact from 'svelte-preprocess-react/preprocessReact';
import { parse } from 'svelte/compiler';

const sveltePlugin = (
    svelteOptions: Parameters<typeof esbuildSvelte>[0] = {}
): SpringboardPlugin => (buildConfig) => {
    return {
        name: 'svelte',

        // editBuildOptions: (buildOptions) => {
        //     buildOptions.conditions = (buildOptions.conditions || []).concat(['svelte']);
        //     buildOptions.mainFields = (buildOptions.mainFields || []).concat([
        //         'svelte',
        //         'browser',
        //         'module',
        //         'main',
        //     ]);

        //     // Avoid esbuild prematurely parsing .svelte.js as JS
        //     buildOptions.loader = {
        //         ...(buildOptions.loader || {}),
        //         '.svelte.js': 'file',
        //         '.svelte.ts': 'file',
        //     };
        // },

        esbuildPlugins: () =>
            buildConfig.platform === 'browser'
                ? [
                    esbuildSvelte({
                        ...svelteOptions,

                        // include: (filePath) => {
                        //   if (filePath.endsWith('.svelte')) return true;

                        //   if (
                        //     (filePath.endsWith('.svelte.js') || filePath.endsWith('.svelte.ts')) &&
                        //     // Skip broken files from svelte-preprocess-react
                        //     !filePath.includes('svelte-preprocess-react/dist/sveltify.svelte.js') &&
                        //     !filePath.includes('svelte-preprocess-react/dist/hooks.svelte.js')
                        //   ) {
                        //     return true;
                        //   }

                        //   return false;
                        // },

                        filterWarnings: () => true,

                        preprocess: [
                            sveltePreprocess({
                                typescript: {
                                    compilerOptions: {
                                        verbatimModuleSyntax: true,
                                    },
                                },
                            }),
                            // preprocessReact({ react: 19 }),
                            ...(
                                Array.isArray(svelteOptions?.preprocess)
                                    ? svelteOptions.preprocess
                                    : svelteOptions?.preprocess
                                        ? [svelteOptions.preprocess]
                                        : []
                            ),
                        ],

                        compilerOptions: {
                            generate: 'client',
                            ...svelteOptions?.compilerOptions,
                        },
                    }),
                ]
                : [
                    {
                        name: 'svelte-module-extractor',
                        setup(build) {
                            build.onLoad({ filter: /\.svelte$/ }, async (args) => {
                                const source = await fs.readFile(args.path, 'utf8');
                                const ast = parse(source, { modern: true });

                                if (ast.module && ast.module.content) {
                                    const start =
                      ast.module.start +
                      source.slice(ast.module.start).indexOf('>') +
                      1;
                                    const end = source.slice(0, ast.module.end).lastIndexOf('<');

                                    const moduleCode =
                      source.slice(start, end) + '\nexport default {}';

                                    return {
                                        contents: moduleCode,
                                        loader: 'tsx',
                                    };
                                }

                                return {
                                    contents: '',
                                    loader: 'tsx',
                                };
                            });
                        },
                    },
                ],
    };
};

export default sveltePlugin;
