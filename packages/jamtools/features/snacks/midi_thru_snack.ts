import {jamtools} from 'springboard/engine/register';

jamtools.registerModule('midi_thru', {}, async (moduleAPI) => {
    console.log('running snack: midi thru');

    const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');

    const [input, output] = await Promise.all([
        macroModule.createMacro(moduleAPI, 'MIDI Input', 'musical_keyboard_input', {}),
        macroModule.createMacro(moduleAPI, 'MIDI Output', 'musical_keyboard_output', {}),
    ]);

    input.subject.subscribe(evt => {
        output.send(evt.event);
    });
});
