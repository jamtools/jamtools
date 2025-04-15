import esbuild from 'esbuild';

import {esbuildPluginPlatformInject} from 'springboard-cli/src/esbuild_plugins/esbuild_plugin_platform_inject';

import {nodeExternalsPlugin} from 'esbuild-node-externals';

esbuild.build({
    entryPoints: ['/Users/mickmister/code/midibuddy2/packages/rn-main/rn_host_init_module.ts'],
    // entryPoints: ['/Users/mickmister/code/midibuddy2/apps/mobile/App.tsx'],

    // entryPoints: ['./src-dir/index.ts'],
    platform: 'neutral',
    target: 'ES2020',
    outfile: '/Users/mickmister/code/midibuddy2/apps/mobile/app/entrypoints/rn_init_module.js',
    bundle: true,
    plugins: [
        nodeExternalsPlugin({
            allowList: ['@springboardjs/*', '@jamtools/*', '@acme/store', '@acme/rn-shared'],
            forceExternalList: ['me'],
            cwd: '/Users/mickmister/code/midibuddy2/apps/mobile',
        }),
        // esbuildPluginPlatformInject('react-native'),
    ],
    // loader: {

    // },
    external: ['*.html', '*.asset', '*.ttf', '@expo/*', 'react', '@react-native/*', 'react-native', 'react-native*', '*.css', 'expo*', 'springboard']
});

// Creating a Custom Logging Plugin:

// Here's how you can implement a custom plugin to log resolved and ignored files:

// javascript
// Copy
// Edit
// const esbuild = require('esbuild');

// const resolutionLoggerPlugin = {
//   name: 'resolution-logger',
//   setup(build) {
//     // Hook into the resolution process
//     build.onResolve({ filter: /.*/ }, (args) => {
//         console.log(`Resolving: ${args.path} from ${args.importer || 'entry point'}`);
//         return null; // Continue with esbuild's default resolution
//       });

//       // Hook into the loading process
//       build.onLoad({ filter: /.*/ }, (args) => {
//         console.log(`Loading: ${args.path}`);
//         return null; // Continue with esbuild's default loading
//       });
//     },
//   };

//   esbuild.build({
//     entryPoints: ['app.js'],
//     bundle: true,
//     outfile: 'out.js',
//     plugins: [resolutionLoggerPlugin],
//   }).catch(() => process.exit(1));
