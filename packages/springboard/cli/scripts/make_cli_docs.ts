import {program} from 'commander';

(globalThis as any).AVOID_PROGRAM_PARSE = true;

const main = async () => {
    await import('../src/cli');

    const lines: string[] = [];
    const cliName = program.name();

    lines.push(`---
title: "${cliName}"
description: "CLI to manage Springboard apps"
summary: ""
date: 2023-09-07T16:04:48+02:00
lastmod: 2023-09-07T16:04:48+02:00
draft: false
weight: 500
toc: true
seo:
    title: "${cliName}" # custom title (optional)
    description: "CLI to manage Springboard apps" # custom description (recommended)
    canonical: "" # custom canonical URL (optional)
    robots: "" # custom robot tags (optional)
---
`);

    lines.push('');

    const helpText = program.helpInformation();
    const commandsStart = helpText.indexOf('Commands:');
    const helpTextTrimmed = helpText.slice(commandsStart);

    let helpTextLines = helpTextTrimmed.split('\n');
    helpTextLines = helpTextLines.filter(line => !line.includes('--version') && !line.includes('--help'));
    const finalHelpText = helpTextLines.join('\n');

    lines.push('```shell\n' + finalHelpText + '```');

    for (const command of program.commands) {
        lines.push('\n----------\n');
        lines.push(`## ${cliName} ${command.name()}\n`);

        const helpText = command.helpInformation().replace('Usage: ', 'Usage: npx ');
        lines.push('```shell\n' + helpText + '```\n');
    }

    const fs = await import('node:fs/promises');
    await fs.writeFile(`../../../doks/jamtools-docs/content/docs/cli/CLI_DOCS_${cliName}.md`, lines.join('\n'));
};

main();
