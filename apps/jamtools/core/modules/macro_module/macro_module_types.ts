import {MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS} from '~/constants/midi_number_to_note_name_mappings';
import type {MusicalKeyboardInputHandler} from './macro_handlers/musical_keyboard_input_macro_handler';

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

export type MacroConfigItem = MacroConfigItemMusicalKeyboardInput | MacroConfigItemMusicalKeyboardOutput;

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

type MacroTypes = 'musical_keyboard_input' | 'musical_keyboard_output';

export type ProducedTypeMap<T extends string> =
  T extends 'musical_keyboard_input' ? MusicalKeyboardInputHandler :
      T extends 'musical_keyboard_output' ? OutputMidiDevice:
          never;

export type ProducedType<T extends MacroConfigItem> = ProducedTypeMap<T['type']>;

export type ProducedTypeFromTypeString<T extends MacroTypes> = ProducedTypeMap<T>;

export function stubProducedMacros<T extends RegisteredMacroConfigItems >(
    config: T
): { [K in keyof T]: ProducedType<T[K]> } {
    const result = {} as { [K in keyof T]: ProducedType<T[K]> };
    return result;
}

export type FullInputConfig = {
    [fieldName: string]: MacroConfigItem;
}

export type FullProducedOutput<T extends FullInputConfig> = {
    [K in keyof T]: ProducedType<T[K]>;
}


// how do I structure the directories to differentiate between plumbing modules and feature modules?
// plumbing, porcelain, feature

// I think the macro module will need to be aware of the other modules types
// so it knows about all of the available config things. like assigning chord families to things
// a porcelain module "chord_family_commander" provides a way to register combos of midi instruments and chord families in the macro module UI
// then a feature module just needs to declare a macro config item of type "chord_family_output", and it will be given a function to send a chord identifier to be played
// as well as provide an "all notes off" functionality, so you can do staccato stuff
