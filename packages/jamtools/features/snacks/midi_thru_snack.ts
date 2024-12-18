import springboard from 'springboard';

springboard.registerModule('midi_thru', {}, async (moduleAPI) => {
    const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');

    const [input, output] = await Promise.all([
        macroModule.createMacro(moduleAPI, 'MIDI Input', 'musical_keyboard_input', {}),
        macroModule.createMacro(moduleAPI, 'MIDI Output', 'musical_keyboard_output', {}),
    ]);

    input.subject.subscribe(evt => {
        output.send(evt.event);
    });
});
