import fs from 'fs';

export function esbuildPluginPlatformInject(platform) {
  return {
    name: 'platform-macro',
    setup(build) {
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        let source = await fs.promises.readFile(args.path, 'utf8');

        // Replace platform-specific blocks based on the platform
        const platformRegex = new RegExp(`\/\/ @platform "${platform}"([\\s\\S]*?)\/\/ @platform end`, 'g');
        const otherPlatformRegex = new RegExp(`\/\/ @platform "(node|browser)"([\\s\\S]*?)\/\/ @platform end`, 'g');

        // Include only the code relevant to the current platform
        source = source.replace(platformRegex, '$1');

        // Remove the code for the other platforms
        source = source.replace(otherPlatformRegex, '');

        return {
          contents: source,
          loader: args.path.split('.').pop(),
        };
      });
    },
  };
}
