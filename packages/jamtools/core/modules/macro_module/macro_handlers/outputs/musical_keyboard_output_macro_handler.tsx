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
import {getKeyForMacro} from '../macro_handler_utils';

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

const ALL_CHANNEL_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

type AddingOutputDeviceState = {
    device: string | null;
    channel: number | null;
}

type SavedOutputDeviceState = {
    device: string;
    channel: number;
}

// we'll need to show the available midi output devices
// and also poll for newly connected ones
// get toast working too. instead of alert
// support broadcasting toasts
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

        const onChooseChannel = createAction('on_choose_channel', async (args: {channel: string}) => {
            const state = addingOutputDevice.getState();
            addingOutputDevice.setState({device: state.device, channel: parseInt(args.channel)});
        });

        const onConfirmChannel = createAction('on_confirm_channel', async () => {
            const state = addingOutputDevice.getState();
            if (!state.device) {
                throw new Error('no device selected');
            }
            if (!state.channel) {
                throw new Error('no channel selected');
            }

            // TODO: de-dupe
            const saved = savedOutputDevices.getState();
            savedOutputDevices.setState([...saved, {
                device: state.device,
                channel: state.channel,
            }]);

            addingOutputDevice.setState({device: null, channel: null});
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
                        onConfirmChannel={() => onConfirmChannel({})}
                        queuedDevice={queuedDevice}
                        savedDevices={saved}
                    />
                );
            },
        };

        const soundfontResult = new SoundfontPeripheral();
        await soundfontResult.initialize();

        const send = (midiEvent: MidiEvent) => {
            soundfontResult.send(midiEvent);

            const saved = savedOutputDevices.getState();
            for (const device of saved) {
                ioModule.sendMidiEvent(device.device, {
                    ...midiEvent,
                    channel: device.channel,
                });
            }
        };

        return {
            send,
            initialize: soundfontResult.initialize,
            components,
        };
    }),
);

type EditProps = {
    editing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    availableMidiOutputs: string[];
    queuedDevice: AddingOutputDeviceState;
    savedDevices: SavedOutputDeviceState[];
    askToDelete: (savedDevice: SavedOutputDeviceState) => void;
    onChooseChannel: (channel: string) => void;
    onConfirmChannel: () => void;
    onClickOutput: (device: string) => void;
}

const Edit = (props: EditProps) => {
    if (!props.editing) {
        return (
            <div>
                <button
                    type='button'
                    onClick={props.onEdit}
                >
                    Edit
                </button>
                {props.savedDevices.length}
            </div>
        );
    }

    return (
        <div>
            <button
                type='button'
                onClick={props.onCancelEdit}
            >
                Cancel
            </button>
            <div>
                Saved outputs:
                <ul>
                    {props.savedDevices.map(savedDevice => (
                        <li
                            key={savedDevice.device + '|' + savedDevice.channel}
                            onClick={() => props.askToDelete(savedDevice)}
                        >
                            {savedDevice.device} {' - '} {savedDevice.channel}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                Queued device: {props.queuedDevice.device || 'none'}
                {props.queuedDevice.device && (
                    <div>

                        <div>
                            <select
                                onChange={e => {
                                    const value = e.currentTarget.value;
                                    props.onChooseChannel(value);
                                }}
                                value={new String(props.queuedDevice.channel).toString()}
                            >
                                {ALL_CHANNEL_NUMBERS.map(n => (
                                    <option
                                        key={n}
                                    >
                                        {n + 1}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {Boolean(props.queuedDevice.channel) && (
                                <button
                                    type='button'
                                    onClick={() => props.onConfirmChannel()}
                                >
                                    Confirm
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div>
                Available outputs:
                <ul>
                    {props.availableMidiOutputs.map(output => (
                        <li
                            onClick={() => props.onClickOutput(output)}
                            key={output}
                        >
                            <pre>{output}</pre>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
