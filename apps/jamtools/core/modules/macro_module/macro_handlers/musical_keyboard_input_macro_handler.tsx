import React, {useEffect, useState} from 'react';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {MacroConfigItemMusicalKeyboardInput, MidiDeviceAndChannel, MidiDeviceAndChannelMap, MidiEventFull, makeHashedMidiDeviceAndChannel} from '../macro_module_types';
import {QwertyCallbackPayload} from '~/types/io_types';
import {Subject} from 'rxjs';
import {QWERTY_TO_MIDI_MAPPINGS} from '~/constants/qwerty_to_midi_mappings';
import {MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS} from '~/constants/midi_number_to_note_name_mappings';

type StoredMusicalKeyboardData = MidiDeviceAndChannel[];

const makeStoredKeyForMusicalKeyboard = (moduleId: string, fieldName: string) => {
    return `${moduleId}-${fieldName}-musical_keyboard`;
};

const useSubject = <T,>(initialData: T, subject: Subject<T>) => {
    const [state, setState] = useState(initialData);

    useEffect(() => {
        const subscription = subject.subscribe((data) => {
            setState(data);
        });

        return () => subscription.unsubscribe();
    }, []);

    return state;
};

declare module '~/modules/macro_module/macro_module_types' {
    interface ProducedTypeMap {
        musical_keyboard_input: MusicalKeyboardInputHandler;
    }
}

export class MusicalKeyboardInputHandler {
    configuredMappings: MidiDeviceAndChannelMap<boolean> = {};

    cleanup: (() => void)[] = [];

    constructor(private moduleId: string, private fieldName: string, private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies, private conf: MacroConfigItemMusicalKeyboardInput) {}

    initialize = async () => {
        const storedKey = makeStoredKeyForMusicalKeyboard(this.moduleId, this.fieldName);
        const storedValue = await this.coreDeps.kvStore.get<StoredMusicalKeyboardData>(storedKey);
        if (storedValue) {
            this.prepareMappings(storedValue);
        }

        const ioModule = this.moduleDeps.moduleRegistry.getModule('io');

        const sub = ioModule.qwertyInputSubject.subscribe(event => {
            this.qwertyKeyPressed(event);
        }); this.cleanup.push(sub.unsubscribe);
    };

    // I wonder if there should be a separate subject like "note event", so as to avoid clock and pitch wheel events coming through here. idk what the performance impact would be
    onEventSubject = new Subject<MidiEventFull>();

    qwertyKeyPressed = (event: QwertyCallbackPayload) => {
        const midiNumber = QWERTY_TO_MIDI_MAPPINGS[event.key as keyof typeof QWERTY_TO_MIDI_MAPPINGS];
        if (midiNumber === undefined) {
            return;
        }

        const index = this.state.currentQwertyPressInfo.indexOf(event.key);

        if (event.event === 'keydown') {
            if (index !== -1) {
                return;
            }

            this.state = {currentQwertyPressInfo: [...this.state.currentQwertyPressInfo, event.key]};
        } else {
            this.state = {currentQwertyPressInfo: [
                ...this.state.currentQwertyPressInfo.slice(0, index),
                ...this.state.currentQwertyPressInfo.slice(index + 1),
            ]};
        }

        this.debugReactSubject.next(this.state);
        this.actions.setState(this.state);

        const fullEvent: MidiEventFull = {
            device: null as any,
            deviceInfo: {type: 'midi', subtype: 'midi_input'},
            event: {
                channel: 0,
                number: midiNumber,
                type: event.event === 'keydown' ? 'noteon' : 'noteoff',
                velocity: 127,
            },
            type: 'midi',
        };

        const onTrigger = this.conf.onTrigger;
        if (onTrigger) {
            onTrigger(fullEvent);
        }

        this.onEventSubject.next(fullEvent);
    };

    onMidiMessage = (midiEvent: MidiEventFull) => {
        const device = midiEvent.device.name!;
        const channel = midiEvent.event.channel;
        const hashedKey = makeHashedMidiDeviceAndChannel({device, channel});

        if (this.configuredMappings[hashedKey]) {
            const onTrigger = this.conf.onTrigger;
            if (onTrigger) {
                onTrigger(midiEvent);
            }

            this.onEventSubject.next(midiEvent);
        }
    };

    public getCurrentlyHeldDownNotes = () => {
        this.coreDeps.log('getCurrentlyHeldDownNotes');
    };

    state = {
        currentQwertyPressInfo: [] as string[],
    };

    private setState = async (state: Partial<typeof this.state>) => {
        this.state = {...this.state, ...state};
        this.debugReactSubject.next(this.state);
        return '';
    };

    private debugReactSubject: Subject<this['state']> = new Subject();

    Component = () => {
        const state = useSubject(this.state, this.debugReactSubject);

        return (
            <div>
                <pre>
                    {state.currentQwertyPressInfo.map((key) => (
                        <div key={key}>
                            {MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS[(
                                QWERTY_TO_MIDI_MAPPINGS[key as keyof typeof QWERTY_TO_MIDI_MAPPINGS] % 12
                            ) as keyof typeof MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS]}
                        </div>
                    ))}
                </pre>
            </div>
        );
    };

    // each "Handler" implementation is responsible for providing a way to enable/disable things
    // including the UI around checkboxes etc.
    // so the Handler's data model can be centered around enabling/disabling things
    // it's also the Handler's responsibility to support lists/groups of things
    // decoupled from the rest of the system
    // stored arbitrarily in the kvstore

    makeId = () => makeStoredKeyForMusicalKeyboard(this.moduleId, this.fieldName);

    // have a few components here like:
    // Show
    // Edit (will open in a modal maybe)
    // maybe use dot menus to have actions
    // instead of modals
    // this way the UI can adapt instead of making it in your face
    // no maestro logic needed then in the ui

    // how do we communicate updates to React from this class?
    // will we use a React context created by this Handler object?
    // maybe the framework can inject the Handler's "state" as a prop
    // similar to how "setState" is an established thing that spreads data updates
    // whenever the Handler's "state" changes, the framework is notified, and any component showing is re-rendered with that new state value

    // for rpc method targeting for specific devices,
    // the message needs to be formed in a way where it potentially runs only for maestro etc.
    // the message can be sent to everyone, but must be captured in a way to say where it should run.
    // this truly de-centralizes the whole thing
    // this allows people to send messages with the messaging feature easier
    // it "just works"
    // this allows the maestro to navigate people around

    dotMenuEdit = async (args: {clicked: boolean}) => {
        // set some local state to start listening for the next incoming midi note

        return 'hey';
    };

    submitEditForm = async () => {
        const res = await this.saveConfig({} as any);
        // user confirmed
    };

    cancelEditForm = async () => {
        // user confirmed
    };

    // this will be called when the module using this is shut down. or something like that
    close = () => {
        // this.midiSubject.unsubscribe();
    };

    private prepareMappings = (value: StoredMusicalKeyboardData) => {
        this.configuredMappings = {};
        for (const keyboard of value) {
            this.configuredMappings[makeHashedMidiDeviceAndChannel(keyboard)] = true;
        }
    };

    private saveConfig = async (value: StoredMusicalKeyboardData) => {
        const storedKey = makeStoredKeyForMusicalKeyboard(this.moduleId, this.fieldName);
        await this.coreDeps.kvStore.set(storedKey, value);
    };

    wrapRpc = <Args, Return>(cb: (args: Args) => Promise<Return>, methodName: string, sendUnconditionally: boolean): ((args: Args) => Promise<Return | string>) => {
        const id = this.makeId();
        const fullMethodName = `${id}.${methodName}`;

        this.moduleDeps.rpc.registerRpc(fullMethodName, cb);

        return async (args: Args) => {
            if (this.moduleDeps.isMaestro()) {
                const result = cb(args);

                if (!sendUnconditionally) {
                    return result;
                }
            }

            return this.moduleDeps.rpc.callRpc<Args, Return>(fullMethodName, args, {isMaestroOnly: true});
        };
    };

    actions = {
        dotMenuEdit: this.wrapRpc(this.dotMenuEdit, 'dotMenuEdit', false),
        setState: this.wrapRpc(this.setState, 'setState', true),
    };
}
