import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';

const SpringboardPlatformNames = z.enum([
    'browser',
    'server',
    'mobile',
    'desktop',
    'partykit_browser',
    'partykit_server',
]);

const SpringboardPlatformBuildTypes = z.enum([
    'all',
    'main',
    'mobile',
    'desktop',
    'browser_offline',
    'partykit',
]);

const browserConfigSchema = z.object({
    platform: z.literal('browser'),
    config: z.object({
        browserThing: z.string(),
    }),
});

const serverConfigSchema = z.object({
    platform: z.literal('server'),
    config: z.object({
        serverThing: z.string(),
    }),
});

// const allConfigSchemas = z.discriminatedUnion('platform', [
//     browserConfigSchema,
//     serverConfigSchema,
// ]);

// const allConfigSchemas = z.union([
//     browserConfigSchema,
//     serverConfigSchema,
// ]);

const allConfigSchemas = z.object({
    platform: z.enum(['server', 'browser']),
    config: z.record(z.any()),
});

// const documentMetaSchema = z.object({
//     'Content-Security-Policy': z.string().optional(),
//     keywords: z.string().optional(),
//     author: z.string().optional(),
//     robots: z.string().optional(),
//     'og:title': z.string().optional(),
//     'og:description': z.string().optional(),
//     'og:image': z.string().optional(),
//     'og:url': z.string().optional(),
// });

const cascadingSchema = () => z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    documentMeta: z.object({
        'Content-Security-Policy': z.string().optional(),
        keywords: z.string().optional(),
        author: z.string().optional(),
        robots: z.string().optional(),
        'og:title': z.string().optional(),
        'og:description': z.string().optional(),
        'og:image': z.string().optional(),
        'og:url': z.string().optional(),
    }).optional(),
    esbuildPlugins: z.array(z.object({
        path: z.string(),
        args: z.any().optional(),
        export: z.string().default('default'),
    })).optional(),
    externals: z.array(z.string()).optional(),
    additionalFiles: z.record(z.string()).optional(),
    fingerprint: z.boolean().optional(),
    outDir: z.string().optional(),
    nodeModulesParentFolder: z.string().optional(),
    watch: z.boolean().optional(),
    dev: z.object({
        reloadJs: z.boolean().optional(),
        reloadCss: z.boolean().optional(),
    }).optional(),
});

const springboardSingleAppConfig = z.object({
    name: z.string().optional(),
    platform: SpringboardPlatformNames,
    platformEntrypoint: z.string().optional(),
    applicationEntrypoint: z.array(z.string()).or(z.string()),
}).and(cascadingSchema()).and(allConfigSchemas);

const springboardFullConfigSchema = z.object({
    $schema: z.string().optional(),
    apps: z.array(springboardSingleAppConfig),
    ids: z.object({
        kebab: z.string(),
        dot: z.string(),
        flat: z.string(),
        pascal: z.string().optional(),
    }),
}).and(cascadingSchema());

const jsonSchema = zodToJsonSchema(springboardFullConfigSchema);

import fs from 'node:fs';
fs.writeFileSync('./schema.json', JSON.stringify(jsonSchema, null, 4));


// type EsbuildOptions = Parameters<typeof esbuild.build>[0];

type BuildConfig = {
    // platform: NonNullable<EsbuildOptions['platform']>;
    // name?: string;
    // platformEntrypoint: () => string;
    // esbuildPlugins?: (args: {outDir: string; nodeModulesParentDir: string, documentMeta?: DocumentMeta}) => any[];
    // externals?: () => string[];
    // additionalFiles?: Record<string, string>;
    // fingerprint?: boolean;
}

export type ApplicationBuildOptions = {
    // name?: string;
    // documentMeta?: DocumentMeta;
    editBuildOptions?: (buildOptions: any) => void; // set to any for simplicity of getting type checker to pass without importing esbuild in this file
    // esbuildOutDir?: string;
    // applicationEntrypoint?: string;
    // nodeModulesParentFolder?: string;
    // watch?: boolean;
    // dev?: {
    //     reloadCss?: boolean;
    //     reloadJs?: boolean;
    // };
};

// type DocumentMeta = {
//     title?: string;
//     description?: string;
//     'Content-Security-Policy'?: string;
//     keywords?: string;
//     author?: string;
//     robots?: string;
//     'og:title'?: string;
//     'og:description'?: string;
//     'og:image'?: string;
//     'og:url'?: string;
// } & Record<string, string>;


// const mySchema = z.object({
//     $schema: z.string().optional(),
//     myString: z.string().min(5).describe('This is the string that tells the story'),
//     myUnion: z.union([z.number(), z.boolean()]).describe('This is my union\nThe point of this is to be as awesome as possible.'),
// }).describe("My neat object schema");
