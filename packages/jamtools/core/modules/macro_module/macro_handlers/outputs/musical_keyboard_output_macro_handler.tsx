import React from 'react';

import {jamtools} from '~/core/engine/register';

import {MidiEvent} from '~/core/modules/macro_module/macro_module_types';

export interface OutputMidiDevice {
    send(midiEvent: MidiEvent): void;
    initialize?: () => Promise<void>;
    components: {
        edit: React.ElementType;
    };
}

import {SoundfontPeripheral} from '~/core/peripherals/outputs/soundfont_peripheral';
import {getKeyForMacro} from '../inputs/input_macro_handler_utils';
import {Edit} from './components/output_macro_edit';
import {AddingOutputDeviceState, SavedOutputDeviceState} from './components/output_macro_edit';

type MusicalKeyboardOutputMacroConfig = {
    allowLocal?: boolean;
};

declare module '~/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        musical_keyboard_output: {
            input: MusicalKeyboardOutputMacroConfig;
            output: OutputMidiDevice;
        }
    }
}

jamtools.registerMacroType(
    'musical_keyboard_output',
    {},
    (async (macroAPI, inputConf, fieldName) => {
        const ioModule = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io');
        const editingState = await macroAPI.moduleAPI.statesAPI.createSharedState(getKeyForMacro('editing', fieldName), false);

        const createAction = <Args extends object>(actionName: string, cb: (args: Args) => void) => {
            return macroAPI.moduleAPI.createAction(`macro|${fieldName}|${actionName}`, {}, async (args: Args) => {
                return cb(args);
            });
        };

        const addingOutputDevice = await macroAPI.moduleAPI.statesAPI.createSharedState<AddingOutputDeviceState>(getKeyForMacro('adding_output_device', fieldName), {device: null, channel: null});
        const savedOutputDevices = await macroAPI.moduleAPI.statesAPI.createPersistentState<SavedOutputDeviceState[]>(getKeyForMacro('saved_output_devices', fieldName), []);

        const onClickOutput = createAction('on_click_available_output', async (args: {device: string}) => {
            addingOutputDevice.setState({device: args.device, channel: 1});
        });

        let soundfontResult: SoundfontPeripheral | undefined;
        if (savedOutputDevices.getState().find(output => output.device === 'soundfont')) {
            soundfontResult = new SoundfontPeripheral();
            setTimeout(() => {
                soundfontResult!.initialize();
            });
        }

        const onClickSoundfont = () => {
            soundfontResult = new SoundfontPeripheral();
            setTimeout(() => {
                soundfontResult!.initialize();
            });

            saveOutputDevice({
                channel: 1,
                device: 'soundfont',
            });
        };

        const onChooseChannel = createAction('on_choose_channel', async (args: {channel: string}) => {
            const state = addingOutputDevice.getState();
            addingOutputDevice.setState({device: state.device, channel: parseInt(args.channel)});
        });

        const saveOutputDevice = (state: SavedOutputDeviceState) => {
            // TODO: de-dupe
            const saved = savedOutputDevices.getState();
            savedOutputDevices.setState([...saved, {
                device: state.device,
                channel: state.channel,
            }]);

            addingOutputDevice.setState({device: null, channel: null});
        };

        const onConfirmChannel = createAction('on_confirm_channel', async () => {
            const state = addingOutputDevice.getState();
            if (!state.device) {
                throw new Error('no device selected');
            }
            if (!state.channel) {
                throw new Error('no channel selected');
            }

            saveOutputDevice({
                channel: state.channel,
                device: state.device,
            });
        });

        const onConfirmDeleteSavedDevice = createAction('on_confirm_delete_saved_device', async (args: SavedOutputDeviceState) => {
            const state = savedOutputDevices.getState();
            const index = state.findIndex(o => o.device === args.device && o.channel === args.channel);
            if (index === -1) {
                throw new Error('no saved output device found to delete ' + args.device);
            }

            savedOutputDevices.setState([
                ...state.slice(0, index),
                ...state.slice(index + 1),
            ]);

            if (args.device === 'soundfont') {
                if (soundfontResult) {
                    soundfontResult.destroy();
                }
            }
        });

        const askToDelete = (device: SavedOutputDeviceState) => {
            if (confirm('delete thing ' + device.device + '|' + device.channel)) {
                onConfirmDeleteSavedDevice(device);
            }
        };

        const onEdit = createAction('begin_edit', () => {
            editingState.setState(true);
        });

        const onCancelEdit = createAction('cancel_edit', () => {
            editingState.setState(false);
            // waitingForConfiguration.setState(false);
            // capturedMidiEvent.setState(null);
        });

        const components = {
            edit: () => {
                const midiDevices = ioModule.midiDeviceState.useState();
                const queuedDevice = addingOutputDevice.useState();
                const saved = savedOutputDevices.useState();
                const editing = editingState.useState();

                return (
                    <Edit
                        editing={editing}
                        onEdit={() => onEdit({})}
                        onCancelEdit={() => onCancelEdit({})}
                        askToDelete={askToDelete}
                        availableMidiOutputs={midiDevices.midiOutputDevices}
                        onChooseChannel={(channel: string) => onChooseChannel({channel})}
                        onClickOutput={(device: string) => onClickOutput({device})}
                        onClickSoundfont={onClickSoundfont}
                        onConfirmChannel={() => onConfirmChannel({})}
                        queuedDevice={queuedDevice}
                        savedDevices={saved}
                    />
                );
            },
        };

        const send = (midiEvent: MidiEvent) => {
            soundfontResult?.send(midiEvent);

            const saved = savedOutputDevices.getState();
            for (const device of saved) {
                if (device.device === 'soundfont') {
                    soundfontResult?.send(midiEvent);
                    continue;
                }

                ioModule.sendMidiEvent(device.device, {
                    ...midiEvent,
                    channel: device.channel,
                });
            }
        };

        return {
            send,
            components,
        };
    }),
);
