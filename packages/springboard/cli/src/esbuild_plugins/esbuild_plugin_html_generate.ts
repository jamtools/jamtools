import fs from 'fs';

import type {Plugin} from 'esbuild';

export const esbuildPluginHtmlGenerate = (outDir: string, htmlFilePath: string): Plugin => {
    return {
        name: 'html-asset-insert',
        setup(build) {
            build.onEnd(async result => {
                const outputFiles = Object.keys(result.metafile!.outputs).filter(f => !f.endsWith('.map'));

                let htmlFileContent = (await fs.promises.readFile(htmlFilePath)).toString();
                const bodyEnd = '</body>';
                const headEnd = '</head>';

                for (const f of outputFiles) {
                    if (f.endsWith('.js')) {
                        const fname = f.split('/').pop();
                        const jsTag = `<script src="/dist/${fname}"></script>`;
                        htmlFileContent = htmlFileContent.replace(bodyEnd, `${jsTag}\n${bodyEnd}`);
                    }
                    if (f.endsWith('.css')) {
                        const fname = f.split('/').pop();
                        const cssTag = `<link rel="stylesheet" href="/dist/${fname}">`;
                        htmlFileContent = htmlFileContent.replace(headEnd, `${cssTag}\n${headEnd}`);
                    }
                }

                const fullDestFilePath = `${outDir}/index.html`;
                await fs.promises.writeFile(fullDestFilePath, htmlFileContent);
            });
        }
    };
}
