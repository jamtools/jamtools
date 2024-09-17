import React from 'react';
import {Button} from '~/core/components/Button';

export const ALL_CHANNEL_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

export type AddingOutputDeviceState = {
    device: string | null;
    channel: number | null;
    note?: number | null;
};

export type SavedOutputDeviceState = {
    device: string;
    channel: number;
    note?: number;
};

type EditProps = {
    includeNote?: boolean;
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
    onClickSoundfont: () => void;
};

export const Edit = (props: EditProps) => {
    if (!props.editing) {
        return (
            <div>
                <Button
                    onClick={props.onEdit}
                >
                    Edit
                </Button>
                {props.savedDevices.length}
            </div>
        );
    }

    return (
        <div>
            <Button
                onClick={props.onCancelEdit}
            >
                Cancel
            </Button>

            <SavedOutputs
                askToDelete={props.askToDelete}
                savedDevices={props.savedDevices}
            />

            <QueuedDevice
                queuedDevice={props.queuedDevice}
                onChooseChannel={props.onChooseChannel}
                onConfirmChannel={props.onConfirmChannel}
            />

            <AvailableOutputs
                availableMidiOutputs={props.availableMidiOutputs}
                onClickOutput={props.onClickOutput}
                onClickSoundfont={props.onClickSoundfont}
            />
        </div>
    );
};

type AvailableOutputsProps = {
    availableMidiOutputs: string[];
    onClickOutput: (output: string) => void;
    onClickSoundfont: () => void;
}

const AvailableOutputs = (props: AvailableOutputsProps) => {
    return (
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
                <li
                    onClick={() => props.onClickSoundfont()}
                >
                    <pre>
                        Soundfont
                    </pre>
                </li>
            </ul>
        </div>
    );
};

type QueuedDeviceProps = {
    queuedDevice: AddingOutputDeviceState;
    onChooseChannel: (channel: string) => void;
    onConfirmChannel: () => void;
}

const QueuedDevice = (props: QueuedDeviceProps) => {
    return (
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
                            <Button
                                onClick={() => props.onConfirmChannel()}
                            >
                                Confirm
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

type SavedOutputsProps = {
    savedDevices: SavedOutputDeviceState[];
    askToDelete: (state: SavedOutputDeviceState) => void;
}

const SavedOutputs = (props: SavedOutputsProps) => {
    return (
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
    );
};
