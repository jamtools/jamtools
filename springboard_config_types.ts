

/*
need to have a springboard.json file
which allows you to specify things like plugins/modules to require
what deps need to be external (probably something a plugin.json file provides as well)


then have one esbuild file that compiles all of the platform stuff
server, browser, and ws

it reads from this json file and figures out what it's supposed to do

import config from 'springboard.json';
import {buildAllPlatforms} from 'springboard-cli';
buildAllPlatforms(config);
*/

type ModuleConfig = string;

type ComponentConfig = {
    type: 'svelte';
    glob: string;
}

type SpringboardConfig = {
    modules: ModuleConfig[];

};

const config: SpringboardConfig = {
    modules: [
        '@jamtools/core',
        // '@jamtools/core/springboard.json',
        './src/index.tsx',
        // './src/myplugin',
        // './src/myplugin/springboard.json', // this is equivalent
    ],
    components: [

    ]
}
