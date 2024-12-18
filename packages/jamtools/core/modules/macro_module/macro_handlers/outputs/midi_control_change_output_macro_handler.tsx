import React from 'react';

export interface MidiControlChangeOutputMacroOutput {
    send(value: number): void;
    initialize?: () => Promise<void>;
    components: {
        edit: React.ElementType;
    };
}

import {getKeyForMacro} from '../inputs/input_macro_handler_utils';
import {AddingOutputDeviceState, Edit, SavedOutputDeviceState} from './components/output_macro_edit';
import {OutputMacroStateHolders, checkSavedMidiOutputsAreEqual, useOutputMacroWaiterAndSaver} from './output_macro_handler_utils';
import {macroTypeRegistry} from '@jamtools/core/modules/macro_module/registered_macro_types';

type MidiControlChangeOutputMacroConfig = {
};

declare module '@jamtools/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        midi_control_change_output: {
            input: MidiControlChangeOutputMacroConfig;
            output: MidiControlChangeOutputMacroOutput;
        }
    }
}

macroTypeRegistry.registerMacroType(
    'midi_control_change_output',
    {},
    (async (macroAPI, inputConf, fieldName) => {
        const editingState = await macroAPI.moduleAPI.statesAPI.createSharedState(getKeyForMacro('editing', fieldName), false);
        const addingOutputDevice = await macroAPI.moduleAPI.statesAPI.createSharedState<AddingOutputDeviceState>(getKeyForMacro('adding_output_device', fieldName), {device: null, channel: null});
        const savedOutputDevices = await macroAPI.moduleAPI.statesAPI.createPersistentState<SavedOutputDeviceState[]>(getKeyForMacro('saved_output_devices', fieldName), []);

        const states: OutputMacroStateHolders = {
            editing: editingState,
            adding: addingOutputDevice,
            savedMidiOutputs: savedOutputDevices,
        };

        const macroReturnValue = await useOutputMacroWaiterAndSaver(macroAPI, states, {includeNote: true}, fieldName, checkSavedMidiOutputsAreEqual);

        const ioModule = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io');

        const send = (value: number) => {
            const saved = savedOutputDevices.getState();
            for (const device of saved) {
                ioModule.sendMidiEvent(device.device, {
                    type: 'cc',
                    number: device.note!,
                    channel: device.channel,
                    value,
                });
            }
        };

        return {
            send,
            components: macroReturnValue.components,
        };
    }),
);
