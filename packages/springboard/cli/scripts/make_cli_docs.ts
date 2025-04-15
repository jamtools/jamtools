import {program} from 'commander';

(globalThis as any).AVOID_PROGRAM_PARSE = true;

const main = async () => {
    await import('../src/cli');

    const lines: string[] = [];

    lines.push('# sb');
    lines.push('');

    const helpText = program.helpInformation();
    const commandsStart = helpText.indexOf('Commands:');
    const helpTextTrimmed = helpText.slice(commandsStart);
    lines.push('```shell\n' + helpTextTrimmed + '```');

    for (const command of program.commands) {
        lines.push('\n----------\n');
        lines.push(`## sb ${command.name()}\n`);
        lines.push('```shell\n' + command.helpInformation() + '```\n');
    }

    const fs = await import('node:fs/promises');
    await fs.writeFile('CLI_DOCS.md', lines.join('\n'));
};

main();
