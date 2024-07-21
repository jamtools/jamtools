const esbuild = require('esbuild');
const babelPlugin = require('./esbuild-plugin-babel');

esbuild.build({
  entryPoints: ['../src/app.ts'],
  bundle: true,
  outfile: './dist/bundle.js',
  plugins: [babelPlugin({
    presets: ['@babel/preset-typescript'],
    plugins: ['./babel-plugin-trace-suffix'],
  })],
  platform: 'node',
  target: 'node14',
  sourcemap: true,
  external: ['@opentelemetry/api', 'express', 'express-query'],
}).catch(() => process.exit(1));
