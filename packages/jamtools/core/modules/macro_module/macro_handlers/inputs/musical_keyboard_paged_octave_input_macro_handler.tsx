import React from 'react';

import {MidiEventFull} from '../../macro_module_types';
import {Subject} from 'rxjs';
import {jamtools} from '~/core/engine/register';

type MusicalKeyboardPagedOctaveInputResult = {
    subject: Subject<MidiEventFull>;
    components: {
        edit: React.ElementType;
    };
};

type MacroConfigItemMusicalKeyboardPagedOctaveInput = {
    onTrigger?(midiEvent: MidiEventFull): void;
    enableQwerty?: boolean;
}

declare module '~/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        musical_keyboard_paged_octave_input: {
            input: MacroConfigItemMusicalKeyboardPagedOctaveInput;
            output: MusicalKeyboardPagedOctaveInputResult;
        }
    }
}

jamtools.registerMacroType(
    'musical_keyboard_paged_octave_input',
    {},
    async (macroAPI, conf, fieldName): Promise<MusicalKeyboardPagedOctaveInputResult> => {
        const keyboardMacro = await macroAPI.moduleAPI.createMacro(macroAPI.moduleAPI, fieldName + '|keyboard_input', 'musical_keyboard_input', {});
        const pageDownMacro = await macroAPI.moduleAPI.createMacro(macroAPI.moduleAPI, fieldName + '|page_down', 'midi_button_input', {});
        const pageUpMacro = await macroAPI.moduleAPI.createMacro(macroAPI.moduleAPI, fieldName + '|page_up', 'midi_button_input', {});

        const subject = new Subject<MidiEventFull>();

        return {
            subject,
            components: {
                edit: () => (
                    <>
                        Keyboard:
                        <keyboardMacro.components.edit/>

                        Page down:
                        <pageDownMacro.components.edit/>

                        Page up:
                        <pageUpMacro.components.edit/>
                    </>
                ),
            }
        };
    },
);
