import React, {useEffect, useState} from 'react';

import {produce} from 'immer';

import {MidiEventFull} from '../../macro_module_types';
import {Subject} from 'rxjs';
import {jamtools} from '~/core/engine/register';
import {getKeyForMacro} from './input_macro_handler_utils';
import {Button} from '~/core/components/Button';
import {savedMidiInputsAreEqual} from './musical_keyboard_input_macro_handler';

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

type PagedOctaveInputStoredConfig = {
    octaveOffset: number;
    // beginningOctaveMidiNumber: number;
    numberOfOctaves: number;
}

const initialConfig: PagedOctaveInputStoredConfig = {
    octaveOffset: 4,
    // beginningOctaveMidiNumber: -1,
    numberOfOctaves: 2,
};

jamtools.registerMacroType(
    'musical_keyboard_paged_octave_input',
    {},
    async (macroAPI, conf, fieldName): Promise<MusicalKeyboardPagedOctaveInputResult> => {
        const pagedOctaveInputStoredConfig = await macroAPI.moduleAPI.statesAPI.createPersistentState<PagedOctaveInputStoredConfig>(getKeyForMacro('pagedOctaveInputStoredConfig', fieldName), initialConfig);

        const showConfigurationFormState = await macroAPI.moduleAPI.statesAPI.createSharedState<boolean>(getKeyForMacro('pagedOctaveInputShowForm', fieldName), false);

        const subject = new Subject<MidiEventFull>();

        if (conf.onTrigger) {
            const subscription = subject.subscribe(event => {
                conf.onTrigger!(event);
            });
            macroAPI.onDestroy(subscription.unsubscribe);
        }

        const keyboardMacro = await macroAPI.moduleAPI.createMacro(macroAPI.moduleAPI, fieldName + '|keyboard_input', 'musical_keyboard_input', {});

        const pageDownMacro = await macroAPI.moduleAPI.createMacro(macroAPI.moduleAPI, fieldName + '|page_down', 'midi_button_input', {
            includeRelease: false,
            onTrigger: () => {
                const currentConfig = pagedOctaveInputStoredConfig.getState();

                const newState = produce(currentConfig, (draft => {
                    draft.octaveOffset = draft.octaveOffset - 1;
                }));

                pagedOctaveInputStoredConfig.setState(newState);
            },
        });

        const pageUpMacro = await macroAPI.moduleAPI.createMacro(macroAPI.moduleAPI, fieldName + '|page_up', 'midi_button_input', {
            includeRelease: false,
            onTrigger: () => {
                const currentConfig = pagedOctaveInputStoredConfig.getState();

                const newState = produce(currentConfig, (draft => {
                    draft.octaveOffset = draft.octaveOffset + 1;
                }));

                pagedOctaveInputStoredConfig.setState(newState);
            },
        });

        const submitNumberOfOctaves = macroAPI.moduleAPI.createAction(getKeyForMacro('pagedInput|submitNumberOfOctaves', fieldName), {}, async (args: {numberOfOctaves: number}) => {
            const currentConfig = pagedOctaveInputStoredConfig.getState();

            const newState = produce(currentConfig, (draft => {
                draft.numberOfOctaves = args.numberOfOctaves;
            }));

            pagedOctaveInputStoredConfig.setState(newState);
        });

        const keyboardSub = keyboardMacro.subject.subscribe(event => {
            const savedEvents = keyboardMacro.getStoredEvents();
            const matchedEvent = savedEvents.find(e => savedMidiInputsAreEqual(e, event));
            if (!matchedEvent) {
                return;
            }

            const beginningOctave = matchedEvent.event.number;

            const storedConfig = pagedOctaveInputStoredConfig.getState();
            const numberOfOctaves = storedConfig.numberOfOctaves;

            // if user wants to include an extra "C" at the end of the keyboard, they should select an extra octave to take that C note into account
            if ((event.event.number < beginningOctave) || (event.event.number > (beginningOctave + (numberOfOctaves * 12)) - 1)) {
                return;
            }

            const relativeNote = event.event.number - beginningOctave;
            const scaledNote = (storedConfig.octaveOffset * 12) + relativeNote;

            const result: MidiEventFull = {
                ...event,
                event: {
                    ...event.event,
                    number: scaledNote,
                },
            };
            subject.next(result);
        });
        macroAPI.onDestroy(keyboardSub.unsubscribe);

        return {
            subject,
            components: {
                edit: () => {
                    const show = showConfigurationFormState.useState();
                    const pagedOctaveConfig = pagedOctaveInputStoredConfig.useState();

                    const [numberOfOctaves, setNumberOfOctaves] = useState(pagedOctaveConfig.numberOfOctaves);

                    useEffect(() => {
                        setNumberOfOctaves(pagedOctaveConfig.numberOfOctaves);
                    }, [pagedOctaveConfig.numberOfOctaves]);

                    if (!show) {
                        return (
                            <Button onClick={() => showConfigurationFormState.setState(true)}>
                                Show paged output configuration
                            </Button>
                        );
                    }

                    return (
                        <div>
                            <Button onClick={() => showConfigurationFormState.setState(false)}>
                                Hide paged output configuration
                            </Button>
                            <div>
                                Macro configs:

                                Keyboard with beginning octave:
                                <keyboardMacro.components.edit/>

                                Number of octaves:
                                <form>
                                    <input
                                        type='number'
                                        onChange={event => setNumberOfOctaves(parseInt(event.target.value))}
                                        value={numberOfOctaves}
                                    />
                                    <Button onClick={() => submitNumberOfOctaves({numberOfOctaves})}>
                                        Confirm
                                    </Button>
                                </form>

                                Page down:
                                <pageDownMacro.components.edit/>

                                Page up:
                                <pageUpMacro.components.edit/>

                                Current config:
                                <pre>
                                    {JSON.stringify(pagedOctaveConfig, null, 2)}
                                </pre>
                            </div>
                        </div>
                    );
                },
            }
        };
    },
);