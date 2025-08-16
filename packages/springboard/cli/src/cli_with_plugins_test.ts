import {build} from 'esbuild';

import {resolve} from 'path';
import {pathToFileURL} from 'url';
import {platformBrowserBuildConfig, Plugin} from './build';

const plugins = '/Users/mickmister/code/jamtools/packages/springboard/plugins/svelte/plugin.ts';

setTimeout(async () => {
    const mod = await import(pathToFileURL(resolve(plugins)).href) as {default: Plugin};
    console.log(mod.default(platformBrowserBuildConfig));
}, 1000);
