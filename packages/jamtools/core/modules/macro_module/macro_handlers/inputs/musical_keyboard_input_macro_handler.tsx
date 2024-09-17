import React from 'react';

import {MidiDeviceAndChannelMap, MidiEventFull, makeHashedMidiDeviceAndChannel} from '../../macro_module_types';
import {QwertyCallbackPayload} from '~/core/types/io_types';
import {Subject} from 'rxjs';
import {QWERTY_TO_MIDI_MAPPINGS} from '~/core/constants/qwerty_to_midi_mappings';
import {jamtools} from '~/core/engine/register';
import {SharedStateSupervisor} from '~/core/services/states/shared_state_service';
import {MacroStateHolders, getKeyForMacro, getKeyForMidiEvent, useInputMacroWaiterAndSaver} from './input_macro_handler_utils';

type MusicalKeyboardInputResult = {
    subject: Subject<MidiEventFull>;
    components: {
        edit: React.ElementType;
    };
};

type MacroConfigItemMusicalKeyboardInput = {
    onTrigger?(midiEvent: MidiEventFull): void;
    enableQwerty?: boolean;
}

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
        const editing = await macroAPI.moduleAPI.statesAPI.createSharedState(getKeyForMacro('editing', fieldName), false);
        const waitingForConfiguration = await macroAPI.moduleAPI.statesAPI.createSharedState(getKeyForMacro('waiting_for_configuration', fieldName), false);
        const capturedMidiEvent = await macroAPI.moduleAPI.statesAPI.createSharedState<MidiEventFull | null>(getKeyForMacro('captured_midi_event', fieldName), null);
        const savedMidiEvents = await macroAPI.moduleAPI.statesAPI.createPersistentState<MidiEventFull[]>(getKeyForMacro('saved_midi_event', fieldName), []);
        const states: MacroStateHolders = {
            editing,
            waiting: waitingForConfiguration,
            captured: capturedMidiEvent,
            savedMidiEvents,
        };

        const macroReturnValue = await useInputMacroWaiterAndSaver(macroAPI, states, {includeQwerty: conf.enableQwerty}, fieldName, savedMidiInputsAreEqual);

        if (!macroAPI.moduleAPI.deps.core.isMaestro()) {
            return macroReturnValue;
        }

        const ioModule = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io');

        // const storedUserConfig = dataService.getState();

        // const isQwertyEnabled = true;

        // TODO: uncomment this once UI is done here
        // if (isQwertyEnabled) {
        //     // TODO: subscribe should require a second parameter, the garbage cleanup callback
        //     ioModule.qwertyInputSubject.subscribe(event => {
        //         const midiEvent = qwertyEventToMidiEvent(event, localQwertyData);
        //         if (!midiEvent) {
        //             return;
        //         }

        //         const onTrigger = conf.onTrigger;
        //         if (onTrigger) {
        //             onTrigger(midiEvent);
        //         }

        //         resultEventSubject.next(midiEvent);
        //     }); // .cleanup(macroAPI.onDestroy);
        // }

        const isMidiEnabled = true;
        // const isMidiEnabled = (Object.keys(storedUserConfig).length > 1) || (Object.keys(storedUserConfig).length === 1 && !isQwertyEnabled);

        macroReturnValue.subject.subscribe(event => {

        });

        const sub = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io').midiInputSubject.subscribe(event => {
            if (event.event.type !== 'noteon' && event.event.type !== 'noteoff') {
                return;
            }

            if (waitingForConfiguration.getState()) {
                const captured = capturedMidiEvent.getState();
                if (captured && savedMidiInputsAreEqual(captured, event)) {
                    return;
                }

                capturedMidiEvent.setState(event);
                return;
            }

            const key = getKeyForMidiEvent(event);
            const saved = savedMidiEvents.getState();
            if (saved.find(e => savedMidiInputsAreEqual(e, event))) {
                macroReturnValue.subject.next(event);
                conf.onTrigger?.(event);
            }
        });
        macroAPI.onDestroy(sub.unsubscribe);

        return macroReturnValue;
    },
);

export const getKeyForInputDevice = (event: MidiEventFull) => {
    return `${event.deviceInfo.name}|${event.event.channel}`;
};

const savedMidiInputsAreEqual = (event1: MidiEventFull, event2: MidiEventFull): boolean => {
    return getKeyForInputDevice(event1) === getKeyForInputDevice(event2);
};

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
            number: midiNumber + 24,
            type: event.event === 'keydown' ? 'noteon' : 'noteoff',
            velocity: 100, // maybe make this random or gradually change or something
        },
        type: 'midi',
    };

    return fullEvent;
};
