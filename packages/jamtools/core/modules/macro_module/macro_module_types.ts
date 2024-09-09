import {MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS} from '~/core/constants/midi_number_to_note_name_mappings';
import {MacroOptions} from '~/core/engine/register';

export type MidiDeviceAndChannel = {
    device: string;
    channel: number;
};

export type HashedMidiDeviceAndChannel<DC extends MidiDeviceAndChannel> = `${DC['device']}-${DC['channel']}`;

export const makeHashedMidiDeviceAndChannel = (device: MidiDeviceAndChannel) => `${device.device}-${device.channel}` as const;

export type MidiDeviceAndChannelMap<Value> = {
    [key: HashedMidiDeviceAndChannel<MidiDeviceAndChannel>]: Value;
}

export type MidiEvent = {
    type: 'noteon' | 'noteoff' | 'cc';
    number: number;
    channel: number;
    velocity: number;
}

export const convertMidiNumberToNoteAndOctave = (midiNumber: number): string => {
    const noteName = MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS[(midiNumber % 12) as keyof typeof MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS];

    const octave = Math.ceil((midiNumber + 1) / 12);

    return `${noteName}${octave}` as const;
};

export type DeviceInfo = {
    type: 'midi';
    subtype: 'midi_input' | 'midi_output';
    name: string;
    manufacturer: string;
}

export type MidiEventFull = {
    type: 'midi';
    deviceInfo: DeviceInfo;
    event: MidiEvent;
}

export type MacroConfigItemMusicalKeyboardInput = {
    onTrigger?(midiEvent: MidiEventFull): void;
}

export type MacroConfigItemMusicalKeyboardOutput = {
};

export type MacroConfigItem<MacroTypeId extends keyof MacroTypeConfigs> = MacroTypeConfigs[MacroTypeId]['input'];

export interface OutputMidiDevice {
    send(midiEvent: MidiEvent): void;
    initialize?: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MacroTypeConfigs {}
