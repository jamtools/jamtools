import type {Plugin} from 'esbuild';
import * as fs from 'fs/promises';

export const esbuildPluginTransformAwaitImportToRequire: Plugin = {
    name: 'transform-await-import-to-require',
    setup(build) {
        const outFile = build.initialOptions.outfile;

        build.onEnd(async (result) => {
            if (result.errors.length > 0) {
                return;
            }

            if (!outFile) {
                console.warn('No outfile specified in build options');
                return;
            }

            const contents = await fs.readFile(outFile, 'utf8');
            if (!contents.includes('await import')) {
                return;
            }

            const newContents = contents.replace(
                /(^|\s+)await\s+import(\s*\()/g,
                '$1require$2'
            );
            await fs.writeFile(outFile, newContents);
        })
    }
}
