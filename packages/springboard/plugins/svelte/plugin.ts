import fs from 'node:fs/promises';

import type {Plugin} from 'springboard-cli/src/build';

import esbuildSvelte from 'esbuild-svelte';
import {sveltePreprocess} from 'svelte-preprocess';

import {parse} from 'svelte/compiler';

const sveltePlugin: Plugin = (buildConfig) => {
    return {
        name: 'svelte',
        esbuildPlugins: (args) =>
            buildConfig.platform === 'browser' ? (
                [
                    // Compile svelte component for browser using esbuild-svelte
                    esbuildSvelte({
                        preprocess: sveltePreprocess(),
                    }),
                ]
            ) : (
                [
                    // Extract the module code for server
                    {
                        name: 'svelte-module-extractor',
                        setup(build) {
                            build.onLoad({filter: /\.svelte$/}, async (args) => {
                                const source = await fs.readFile(args.path, 'utf8');

                                const ast = parse(source, {modern: true});
                                if (ast.module && ast.module.content) {

                                    // The parsed code includes the module script tags at the beginning and end, so we remove them
                                    const start = ast.module.start + source.slice(ast.module.start).indexOf('>') + 1;
                                    const end = source.slice(0, ast.module.end).lastIndexOf('<');

                                    // Add an export to the code so it can be imported as a mock of the exported Svelte component
                                    const moduleCode = source.slice(start, end) + '\nexport default {}';

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
                    }
                ]
            )
    };
}

export default sveltePlugin;
