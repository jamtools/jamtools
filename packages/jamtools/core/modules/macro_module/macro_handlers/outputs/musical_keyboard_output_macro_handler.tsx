import {getKeyForMacro} from '../inputs/input_macro_handler_utils';
import {AddingOutputDeviceState, SavedOutputDeviceState} from './components/output_macro_edit';
import {MidiOutputMacroPayload, OutputMacroStateHolders, checkSavedMidiOutputsAreEqual, useOutputMacroWaiterAndSaver} from './output_macro_handler_utils';
import {macroTypeRegistry} from '@jamtools/core/modules/macro_module/registered_macro_types';

export type OutputMidiDevice = MidiOutputMacroPayload;

type MusicalKeyboardOutputMacroConfig = {
    allowLocal?: boolean;
};

declare module '@jamtools/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        musical_keyboard_output: {
            input: MusicalKeyboardOutputMacroConfig;
            output: OutputMidiDevice;
        }
    }
}

macroTypeRegistry.registerMacroType(
    'musical_keyboard_output',
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

        const macroReturnValue = await useOutputMacroWaiterAndSaver(macroAPI, states, {includeSoundfont: true}, fieldName, checkSavedMidiOutputsAreEqual);
        return macroReturnValue;
    }),
);
