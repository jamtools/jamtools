import {jamtools} from '~/core/engine/register';

jamtools.registerModule('midi_thru', {}, (moduleAPI) => {
    return {
        moduleId: 'midi_thru_snack',
        initialize: async () => {
            console.log('running snack: midi thru');

            const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');

            const [input, output] = await Promise.all([
                macroModule.createMacro(moduleAPI, 'MIDI Input', 'musical_keyboard_input', {}),
                macroModule.createMacro(moduleAPI, 'MIDI Output', 'musical_keyboard_output', {}),
            ]);

            input.onEventSubject.subscribe(evt => {
                output.send(evt.event);
            });
        },
    };
});
