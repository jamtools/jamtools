import {defineConfig} from 'tsup';

const directories = [
    'components',
    'engine',
    'module_registry',
    'services',
    'src',
    // 'test',
    'types',
    'utils',
]

export default defineConfig({
    entry: [
        ...directories.map(dirName => `./${dirName}/**/*.{ts,tsx}`),
    ],
    outDir: 'dist',
    format: ['cjs', 'esm'],
    // dts: true,
    dts: false,
    experimentalDts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
});
