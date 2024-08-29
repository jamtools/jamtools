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
