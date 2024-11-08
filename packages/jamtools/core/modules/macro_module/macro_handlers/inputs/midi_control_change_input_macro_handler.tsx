import React from 'react';
import {Subject} from 'rxjs';

import {jamtools} from 'jamtools-core/engine/register';
import {MidiEventFull} from '@jamtools/core/modules/macro_module/macro_module_types';
import {getKeyForMacro, InputMacroStateHolders, useInputMacroWaiterAndSaver, savedMidiEventsAreEqual, getKeyForMidiEvent} from './input_macro_handler_utils';

type MacroConfigItemMidiControlChangeInput = {
    onTrigger?(midiEvent: MidiEventFull): void;
    allowLocal?: boolean;
}

export type MidiControlChangeInputResult = {
    subject: Subject<MidiEventFull>;
    components: {
        edit: React.ElementType;
    };
};

declare module '@jamtools/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        midi_control_change_input: {
            input: MacroConfigItemMidiControlChangeInput;
            output: MidiControlChangeInputResult;
        }
    }
}

jamtools.registerMacroType('midi_control_change_input', {}, async (macroAPI, conf, fieldName) => {
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

    const macroReturnValue = await useInputMacroWaiterAndSaver(macroAPI, states, {}, fieldName, savedMidiEventsAreEqual);

    if (!macroAPI.moduleAPI.deps.core.isMaestro() && !conf.allowLocal) {
        return macroReturnValue;
    }

    const sub = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io').midiInputSubject.subscribe(event => {
        if (event.event.type !== 'cc') {
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
    });
    macroAPI.onDestroy(sub.unsubscribe);

    return macroReturnValue;
});
