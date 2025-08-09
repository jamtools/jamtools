import {program} from 'commander';

(globalThis as any).AVOID_PROGRAM_PARSE = true;

const main = async () => {
    await import('../src/cli');

    const lines: string[] = [];
    const cliName = program.name();

    // TODO: this should be "included" inside a presentational markdown file in the docs folder, instead of generating a markdown file that has frontmatter etc

    lines.push(`---
title: "${cliName}"
description: "CLI to create a new Springboard app"
summary: ""
date: 2023-09-07T16:04:48+02:00
lastmod: 2023-09-07T16:04:48+02:00
draft: false
weight: 810
toc: true
seo:
  title: "create-springboard-app" # custom title (optional)
  description: "CLI to create a new Springboard app" # custom description (recommended)
  canonical: "" # custom canonical URL (optional)
  robots: "" # custom robot tags (optional)
---
`);

    lines.push('## Usage');
    lines.push('```shell');
    lines.push('npx create-springboard-app@latest --template jamtools');
    lines.push('```\n');

    const helpText = program.helpInformation().replace('Usage: ', 'Usage: npx ');
    let helpTextLines = helpText.split('\n');
    helpTextLines = helpTextLines.filter(line => !line.includes('--version') && !line.includes('--help'));
    const finalHelpText = helpTextLines.join('\n');


    lines.push('## Command Reference');

    lines.push('```shell\n' + finalHelpText + '```');

    // for (const command of program.commands) {
    //     lines.push('\n----------\n');
    //     lines.push(`## ${cliName} ${command.name()}\n`);
    //     lines.push('```shell\n' + command.helpInformation() + '```\n');
    // }

    const fs = await import('node:fs/promises');
    await fs.writeFile(`../../../doks/jamtools-docs/content/docs/cli/CLI_DOCS_${cliName}.md`, lines.join('\n'));
};

main();
