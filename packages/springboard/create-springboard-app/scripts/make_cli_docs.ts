import {program} from 'commander';

(globalThis as any).AVOID_PROGRAM_PARSE = true;

const main = async () => {
    await import('../src/cli');

    const lines: string[] = [];
    const cliName = program.name();

    lines.push('# ' + cliName);
    lines.push('');

    const helpText = program.helpInformation();
    // const commandsStart = helpText.indexOf('Commands:');
    // const helpTextTrimmed = helpText.slice(commandsStart);
    lines.push('```shell\n' + helpText + '```');

    // for (const command of program.commands) {
    //     lines.push('\n----------\n');
    //     lines.push(`## ${cliName} ${command.name()}\n`);
    //     lines.push('```shell\n' + command.helpInformation() + '```\n');
    // }

    const fs = await import('node:fs/promises');
    await fs.mkdir('./docs-out', {recursive: true});
    await fs.writeFile(`./docs-out/CLI_DOCS_${cliName}.md`, lines.join('\n'));
};

main();
