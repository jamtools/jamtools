import {jamtools} from '~/core/engine/register';

jamtools.registerClassModule((_coreDeps, modDependencies) => {
    return {
        moduleId: 'root_mode_snack',
        initialize: async () => {
            console.log('running snack: midi thru');

            const macroModule = modDependencies.moduleRegistry.getModule('macro');

            const [input, output] = await Promise.all([
                macroModule.createMacro('MIDI Input', {type: 'musical_keyboard_input'}),
                macroModule.createMacro('MIDI Output', {type: 'musical_keyboard_output'}),
            ]);

            input.onEventSubject.subscribe(evt => {
                output.send(evt.event);
            });
        },
    };
});
