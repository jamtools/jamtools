import {JamToolsEngine} from '~/engine/engine';

import {getBrowserDeps} from './get_browser_deps';

const startJamToolsAndGetMacroModule = async () => {
    const coreDeps = getBrowserDeps();

    const engine = new JamToolsEngine(coreDeps);
    await engine.initialize();

    return engine.moduleRegistry.getModule('macro');
}

setTimeout(() => {
    main();
});

const main = async () => {
    const macroModule = await startJamToolsAndGetMacroModule();

    const [input, output] = await Promise.all([
        macroModule.createMacro('MIDI Input', {type: 'musical_keyboard_input'}),
        macroModule.createMacro('MIDI Output', {type: 'musical_keyboard_output'}),
    ]);

    input.onEventSubject.subscribe(evt => output.send(evt.event));
};

const main0 = async () => {
    const macroModule = await startJamToolsAndGetMacroModule();

    const input = await macroModule.createMacro('MIDI Input', {
        type: 'musical_keyboard_input',
    });

    const output = await macroModule.createMacro('MIDI Output', {
        type: 'musical_keyboard_output',
    });

    input.onEventSubject.subscribe(evt => output.send(evt.event));
};

const main1 = async () => {
    const macroModule = await startJamToolsAndGetMacroModule();

    const output = await macroModule.createMacro('MIDI Output', () => ({
        type: 'musical_keyboard_output',
    }));

    macroModule.createMacro('MIDI Input', () => ({
        type: 'musical_keyboard_input',
        onTrigger: (event) => {
            output.send(event.event);
        },
    }));
};

const main2 = async () => {
    const coreDeps = getBrowserDeps();

    const engine = new JamToolsEngine(coreDeps);
    await engine.initialize();

    engine.moduleRegistry.registerModule({
        moduleId: 'basic_midi_thru',
    });

    const macroModule = engine.moduleRegistry.getModule('macro');

    const macros = await macroModule.createMacros('basic_midi_thru', () => ({
        myMidiInput: {type: 'musical_keyboard_input'},
        myMidiOutput: {type: 'musical_keyboard_output'},
    }));

    macros.myMidiInput.onEventSubject.subscribe((event) => {
        macros.myMidiOutput.send(event.event);
    });
};
