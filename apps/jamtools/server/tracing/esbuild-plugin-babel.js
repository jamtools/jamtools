const babel = require('@babel/core');
const fs = require('fs').promises;

const babelPlugin = (babelOptions) => ({
  name: 'babel',
  setup(build) {
    build.onLoad({ filter: /\.[jt]s$/ }, async (args) => {
        if (args.path.includes('node_modules')) {
          // Skip Babel transformation for node_modules
          return { contents: await fs.readFile(args.path, 'utf8'), loader: 'ts' };
        }

      const source = await fs.readFile(args.path, 'utf8');
      const { code, map, warnings } = await babel.transformAsync(source, {
        ...babelOptions,
        filename: args.path,
        sourceMaps: true,
        sourceFileName: args.path,
        retainLines: true,
      });
      return { contents: code, loader: 'default', warnings };
    });
  },
});

module.exports = babelPlugin;
