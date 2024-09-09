import React, {useEffect, useState} from 'react';

import {MidiDeviceAndChannel, MidiDeviceAndChannelMap, MidiEventFull, makeHashedMidiDeviceAndChannel} from '../macro_module_types';
import {QwertyCallbackPayload} from '~/core/types/io_types';
import {Subject} from 'rxjs';
import {QWERTY_TO_MIDI_MAPPINGS} from '~/core/constants/qwerty_to_midi_mappings';
import {jamtools} from '~/core/engine/register';
import {SharedStateSupervisor} from '~/core/services/states/shared_state_service';

type StoredMusicalKeyboardData = MidiDeviceAndChannel[];

const makeStoredKeyForMusicalKeyboard = (moduleId: string, fieldName: string) => {
    return `${moduleId}-${fieldName}-musical_keyboard`;
};

const useSubject = <T,>(initialData: T, subject: Subject<T>) => {
    const [state, setState] = useState(initialData);

    useEffect(() => {
        const subscription = subject.subscribe((data) => {
            setState(data);
        });

        return () => subscription.unsubscribe();
    }, []);

    return state;
};

type MusicalKeyboardInputResult = {
    onEventSubject: Subject<MidiEventFull>;
    components: {
        edit: React.ElementType;
    };
};

declare module '~/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        musical_keyboard_input: {
            input: MacroConfigItemMusicalKeyboardInput;
            output: MusicalKeyboardInputResult;
        }
    }
}

type MusicalKeyboardInputHandlerSavedData = MidiDeviceAndChannelMap<boolean>;

type LocalState = Record<string, boolean>;

const QWERTY_DEVICE_NAME = 'qwerty';
const QWERTY_CHANNEL_NUMBER = 0;
const QWERTY_DEVICE_AND_CHANNEL = makeHashedMidiDeviceAndChannel({device: 'qwerty', channel: 0});

jamtools.registerMacroType(
    'musical_keyboard_input',
    {},
    async (macroAPI, conf, fieldName): Promise<MusicalKeyboardInputResult> => {
        const id = 'macro|musical_keyboard_input|' + fieldName;
        const dataService = await macroAPI.moduleAPI.states.createPersistentState<MusicalKeyboardInputHandlerSavedData>(id, {});
        const localQwertyData = await macroAPI.moduleAPI.states.createSharedState<LocalState>(id, {});

        const onSelectedMidiMacroToggle = async (midiDeviceName: string, midiChannel: number) => {
            const newPersistentState = {...dataService.getState()};

            const deviceAndChannel = makeHashedMidiDeviceAndChannel({device: midiDeviceName, channel: midiChannel});

            const shouldEnable = !newPersistentState[deviceAndChannel];
            if (shouldEnable) {
                newPersistentState[deviceAndChannel] = true;
            } else {
                newPersistentState[deviceAndChannel] = false;
            }

            await dataService.setState(newPersistentState);
        };

        const onQwertyConfigToggle = async () => {
            return onSelectedMidiMacroToggle(QWERTY_DEVICE_NAME, QWERTY_CHANNEL_NUMBER);
        };

        const components = {
            edit: () => {
                const state = dataService.useState();
                const isQwertyEnabled = Boolean(state[QWERTY_DEVICE_AND_CHANNEL]);

                return (
                    <EditComponent
                        isQwertyEnabled={isQwertyEnabled}
                        onQwertyToggle={onQwertyConfigToggle}
                    />
                );
            },
        };

        const resultEventSubject = new Subject<MidiEventFull>();

        const returnValue: MusicalKeyboardInputResult = {
            onEventSubject: resultEventSubject,
            components,
        };

        const isMaestro = macroAPI.moduleAPI.deps.module.isMaestro();
        if (!isMaestro) {
            return returnValue;
        }

        const ioModule = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io');

        const storedUserConfig = dataService.getState();

        // const isQwertyEnabled = true;

        // TODO: uncomment this once UI is done here
        const isQwertyEnabled = Boolean(storedUserConfig[QWERTY_DEVICE_AND_CHANNEL]);
        if (isQwertyEnabled) {
            // TODO: subscribe should require a second parameter, the garbage cleanup callback
            ioModule.qwertyInputSubject.subscribe(event => {
                const midiEvent = qwertyEventToMidiEvent(event, localQwertyData);
                if (!midiEvent) {
                    return;
                }

                const onTrigger = conf.onTrigger;
                if (onTrigger) {
                    onTrigger(midiEvent);
                }

                resultEventSubject.next(midiEvent);
            }); // .cleanup(macroAPI.onDestroy);
        }

        const isMidiEnabled = true;
        // const isMidiEnabled = (Object.keys(storedUserConfig).length > 1) || (Object.keys(storedUserConfig).length === 1 && !isQwertyEnabled);
        if (isMidiEnabled) {
            ioModule.midiInputSubject.subscribe((event) => {
                if (event.event.type !== 'noteon' && event.event.type !== 'noteoff') {
                    return;
                }

                const deviceAndChannel = makeHashedMidiDeviceAndChannel({device: event.deviceInfo.name || '', channel: event.event.channel});
                const storedUserData = dataService.getState();
                // if (!storedUserData[deviceAndChannel]) {
                //     return;
                // }

                resultEventSubject.next(event);
            }); // .cleanup(macroAPI.onDestroy)
        }

        return returnValue;
    },
);

const qwertyEventToMidiEvent = (event: QwertyCallbackPayload, localStateService: SharedStateSupervisor<LocalState>): MidiEventFull | undefined => {
    const midiNumber = QWERTY_TO_MIDI_MAPPINGS[event.key as keyof typeof QWERTY_TO_MIDI_MAPPINGS];
    if (midiNumber === undefined) {
        return;
    }

    const state = localStateService.getState();

    const currentlyHoldingKey = state[event.key];

    if (event.event === 'keydown') {
        if (currentlyHoldingKey) {
            return;
        }

        localStateService.setState({...state, [event.key]: true});
    } else {
        const newState = {...state};
        delete newState[event.key];
        localStateService.setState(newState);
    }

    const fullEvent: MidiEventFull = {
        deviceInfo: {type: 'midi', subtype: 'midi_input', name: 'qwerty', manufacturer: ''},
        event: {
            channel: 0,
            number: midiNumber,
            type: event.event === 'keydown' ? 'noteon' : 'noteoff',
            velocity: 127,
        },
        type: 'midi',
    };

    return fullEvent;
};

type EditComponentProps = {
    isQwertyEnabled: boolean;
    onQwertyToggle: () => void;
};

const EditComponent = (props: EditComponentProps) => {
    return (
        <div>
            <span>Qwerty enabled: {new String(props.isQwertyEnabled)}</span>
            <button onClick={props.onQwertyToggle}>
                Toggle
            </button>
        </div>
    );
};
