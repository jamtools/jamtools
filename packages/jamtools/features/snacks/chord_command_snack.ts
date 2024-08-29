import {startJamToolsAndRenderApp} from '@/react_entrypoint';
setTimeout(() => {
    main();
});

const main = async () => {
    console.log('running snack: chord command');

    const engine = await startJamToolsAndRenderApp();
    const macroModule = engine.moduleRegistry.getModule('macro');

    const [input, output] = await Promise.all([
        macroModule.createMacro('MIDI Input', {type: 'musical_keyboard_input'}),
        macroModule.createMacro('MIDI Output', {type: 'musical_keyboard_output'}),
    ]);

    input.onEventSubject.subscribe(evt => {
        const intervals = [0, 4, 7, 12];
        for (const i of intervals) {
            const midiNumber = evt.event.number + i + 24;
            output.send({...evt.event, number: midiNumber});
        }
    });
};
