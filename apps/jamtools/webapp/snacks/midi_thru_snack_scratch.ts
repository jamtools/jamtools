import {startJamToolsAndRenderApp} from '@/react_entrypoint';

setTimeout(() => {
    main();
});

const main = async () => {
    console.log('running snack: midi thru');

    const engine = await startJamToolsAndRenderApp();
    const macroModule = engine.moduleRegistry.getModule('macro');

    const [input, output] = await Promise.all([
        macroModule.createMacro('MIDI Input', {type: 'musical_keyboard_input'}),
        macroModule.createMacro('MIDI Output', {type: 'musical_keyboard_output'}),
    ]);

    input.onEventSubject.subscribe(evt => output.send(evt.event));
};

const main0 = async () => {
    const engine = await startJamToolsAndRenderApp();
    const macroModule = engine.moduleRegistry.getModule('macro');

    const input = await macroModule.createMacro('MIDI Input', {
        type: 'musical_keyboard_input',
    });

    const output = await macroModule.createMacro('MIDI Output', {
        type: 'musical_keyboard_output',
    });

    input.onEventSubject.subscribe(evt => output.send(evt.event));
};

const main1 = async () => {
    const engine = await startJamToolsAndRenderApp();
    const macroModule = engine.moduleRegistry.getModule('macro');

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
    const engine = await startJamToolsAndRenderApp();

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
