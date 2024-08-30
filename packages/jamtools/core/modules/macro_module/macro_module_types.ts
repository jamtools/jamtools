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
    type: 'noteon' | 'noteoff';
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
}

export type MidiEventFull = {
    type: 'midi';
    deviceInfo: DeviceInfo;
    device: MIDIInput | MIDIOutput;
    event: MidiEvent;
}

export type MacroConfigItemMusicalKeyboardInput = {
    type: 'musical_keyboard_input';
    onTrigger?(midiEvent: MidiEventFull): void;
}

export type MacroConfigItemMusicalKeyboardOutput = {
    type: 'musical_keyboard_output';
};

export type MacroConfigItem = {type: keyof ProducedTypeMap}
// MacroConfigItemMusicalKeyboardInput | MacroConfigItemMusicalKeyboardOutput;

export type RegisteredMacroConfigItems = {
    [fieldName: string]: MacroConfigItem;
};

export type MacroModuleClient<T extends RegisteredMacroConfigItems> = {
    macroConfig: T;
    updateMacroState(state: FullProducedOutput<T>): void
}

export interface OutputMidiDevice {
    send(midiEvent: MidiEvent): void;
    initialize?: () => Promise<void>;
}

// this interface is meant to be extended by each individual macro type through interface merging
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProducedTypeMap {}

export type ProducedType<T extends keyof ProducedTypeMap> = ProducedTypeMap[T];

export function stubProducedMacros<T extends RegisteredMacroConfigItems >(
    config: T
): { [K in keyof T]: ProducedType<T[K]['type']> } {
    const result = {} as { [K in keyof T]: ProducedType<T[K]['type']> };
    return result;
}

const createMacro = async <MacroType extends keyof ProducedTypeMap>(
    macroName: string,
    macroType: MacroType,
    macroOptions: MacroOptions
): Promise<ProducedTypeMap[MacroType]> => {
    return {} as ProducedTypeMap[MacroType];
};

// just testing out the api types
// setTimeout(async () => {
//     const myMacro = await createMacro('yo', 'musical_keyboard_input', {});
//     myMacro.onEventSubject.subscribe
//     const myMacro2 = await createMacro('yo', 'musical_keyboard_output', {});
// });

export type FullInputConfig = {
    [fieldName: string]: MacroConfigItem;
}

export type FullProducedOutput<T extends FullInputConfig> = {
    [K in keyof T]: ProducedType<T[K]['type']>;
}
