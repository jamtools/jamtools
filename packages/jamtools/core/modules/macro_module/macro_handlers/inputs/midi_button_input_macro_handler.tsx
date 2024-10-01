import React from 'react';
import {Subject} from 'rxjs';

import {jamtools} from '~/core/engine/register';
import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {getKeyForMacro, InputMacroStateHolders, useInputMacroWaiterAndSaver, savedMidiEventsAreEqual, getKeyForMidiEvent} from './input_macro_handler_utils';
import {qwertyEventToMidiEvent, savedMidiInputsAreEqual} from './musical_keyboard_input_macro_handler';

type MacroConfigItemMidiButtonInput = {
    onTrigger?(midiEvent: MidiEventFull): void;
    allowLocal?: boolean;
    enableQwerty?: boolean;
}

export type MidiButtonInputResult = {
    subject: Subject<MidiEventFull>;
    components: {
        edit: React.ElementType;
    };
};

declare module '~/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        midi_button_input: {
            input: MacroConfigItemMidiButtonInput;
            output: MidiButtonInputResult;
        }
    }
}

jamtools.registerMacroType('midi_button_input', {}, async (macroAPI, conf, fieldName) => {
    const editing = await macroAPI.moduleAPI.statesAPI.createSharedState(getKeyForMacro('editing', fieldName), false);
    const waitingForConfiguration = await macroAPI.moduleAPI.statesAPI.createSharedState(getKeyForMacro('waiting_for_configuration', fieldName), false);
    const capturedMidiEvent = await macroAPI.moduleAPI.statesAPI.createSharedState<MidiEventFull | null>(getKeyForMacro('captured_midi_event', fieldName), null);
    const savedMidiEvents = await macroAPI.moduleAPI.statesAPI.createPersistentState<MidiEventFull[]>(getKeyForMacro('saved_midi_event', fieldName), []);
    const states: InputMacroStateHolders = {
        editing,
        waiting: waitingForConfiguration,
        captured: capturedMidiEvent,
        savedMidiEvents,
    };

    const macroReturnValue = await useInputMacroWaiterAndSaver(macroAPI, states, {includeQwerty: conf.enableQwerty}, fieldName, savedMidiEventsAreEqual);

    if (!macroAPI.moduleAPI.deps.core.isMaestro()) {
        return macroReturnValue;
    }

    const handleMidiEvent = (event: MidiEventFull) => {
        if (event.event.type !== 'noteon' && event.event.type !== 'noteoff') {
            return;
        }

        if (event.deviceInfo.name.startsWith('IAC')) {
            return;
        }

        if (waitingForConfiguration.getState()) {
            const captured = capturedMidiEvent.getState();
            if (captured && savedMidiEventsAreEqual(captured, event)) {
                return;
            }

            capturedMidiEvent.setState(event);
            return;
        }

        const key = getKeyForMidiEvent(event);
        const saved = savedMidiEvents.getState();
        if (saved.find(e => getKeyForMidiEvent(e) === key)) {
            macroReturnValue.subject.next(event);
            conf.onTrigger?.(event);
        }
    };

    const midiSubscription = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io').midiInputSubject.subscribe(handleMidiEvent);
    macroAPI.onDestroy(midiSubscription.unsubscribe);

    if (conf.enableQwerty) {
        const qwertySubscription = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io').qwertyInputSubject.subscribe((qwertyEvent => {
            const midiEvent = qwertyEventToMidiEvent(qwertyEvent, false);
            if (!midiEvent) {
                return;
            }

            handleMidiEvent(midiEvent);
        }));
        macroAPI.onDestroy(qwertySubscription.unsubscribe);
    }

    return macroReturnValue;
});