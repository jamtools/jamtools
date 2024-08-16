export type MidiDeviceAndChannel = {
    device: string;
    channel: number;
};

export type HashedMidiDeviceAndChannel<DC extends MidiDeviceAndChannel> = `${DC["device"]}-${DC["channel"]}`;

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
    onTrigger(midiEvent: MidiEventFull): void;
}

export type MacroConfigItemMusicalKeyboardOutput = {
    type: 'musical_keyboard_output';
};

type MacroConfigItem = MacroConfigItemMusicalKeyboardInput | MacroConfigItemMusicalKeyboardOutput;

export type RegisteredMacroConfigItems = {
    [fieldName: string]: MacroConfigItem;
};

export type MacroModuleClient<T extends RegisteredMacroConfigItems> = {
    macroConfig: T;
    updateMacroState(state: FullProducedOutput<T>): void
}

export type ProducedMacroConfigMusicalKeyboardInput = {
    type: 'musical_keyboard_input';
}

export type ProducedMacroConfigMusicalKeyboardOutput = {
    type: 'musical_keyboard_output';
    send: (midiEvent: MidiEvent) => void;
}

type MappedTypes = {
    'musical_keyboard_input': ProducedMacroConfigMusicalKeyboardInput;
    'musical_keyboard_output': ProducedMacroConfigMusicalKeyboardOutput;
}

type ProducedType<T extends MacroConfigItem> = MappedTypes[T["type"]]

const produce = <T extends MacroConfigItem>(myObj: T): ProducedType<T> => {
    return {} as any;
}

export type FullInputConfig = {
    [fieldName: string]: MacroConfigItem;
}

export type FullProducedOutput<T extends FullInputConfig> = {
    [K in keyof T]: () => ProducedType<T[K]>;
}

const produceFull = <T extends FullInputConfig>(myConfig: T): FullProducedOutput<T> => {
    return {} as any;
}

const yeah = {
    type: 'musical_keyboard_input',
    onTrigger: () => {},
} as const;

const produced = produce(yeah);

const fullConfig = {
    yeah,
} as const;

const fullOutput = produceFull(fullConfig);
fullOutput.yeah;

const addThings = (thing: Thing) => {
    return {
        x: 'yay',
    };
};

class Thing {
    config = fullConfig;
    prod: Partial<FullProducedOutput<Thing["config"]>> = {};

    updateMacroConfigState = (prod: Partial<FullProducedOutput<Thing["config"]>>) => {
        this.prod = prod;
    };

    doTheThing = () => {
        // this.prod.yeah?.type;
    }
}

// how do I structure the directories to differentiate between plumbing modules and feature modules?
// plumbing, porcelain, feature

// I think the macro module will need to be aware of the other modules types
// so it knows about all of the available config things. like assigning chord families to things
// a porcelain module "chord_family_commander" provides a way to register combos of midi instruments and chord families in the macro module UI
// then a feature module just needs to declare a macro config item of type "chord_family_output", and it will be given a function to send a chord identifier to be played
// as well as provide an "all notes off" functionality, so you can do staccato stuff
