import React, {createContext} from 'react';

import {Subject} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../../base_module/base_module';
import {Module} from '~/module_registry/module_registry';
import {FullProducedOutput, MacroModuleClient, MidiDeviceAndChannel, MidiDeviceAndChannelMap, MidiEventFull, RegisteredMacroConfigItems} from '~/modules/macro_module/macro_module_types';

type MidiThruState = {
    inputDevice?: MidiDeviceAndChannel;
    outputDevice?: MidiDeviceAndChannel;
};

type HeldDownNotes = number[];

type MidiThruInternalState = {
    heldNotes: {
        inputs: MidiDeviceAndChannelMap<HeldDownNotes>;
        outputs: MidiDeviceAndChannelMap<HeldDownNotes>;
    }
};

const MidiThruComponent = () => {
    return (
        <div>
            Hey
        </div>
    );
}

type MidiThruHookValue = ModuleHookValue<MidiThruModule>;

const midiThruContext = createContext<MidiThruHookValue>({} as MidiThruHookValue);

type MacroConfigState<M extends RegisteredMacroConfigItems> = FullProducedOutput<M>;

export class MidiThruModule implements Module<MidiThruState>, MacroModuleClient<MidiThruModule["macroConfig"]> {
    moduleId = 'basic_midi_thru';

    onMidiInput = (midiEvent: MidiEventFull) => {
        this.macros.myMidiOutput().send(midiEvent.event);
    }

    macroConfig = {
        myMidiInput: {
            type: 'musical_keyboard_input',
            onTrigger: this.onMidiInput,
        },
        myMidiOutput: {
            type: 'musical_keyboard_output',
        },
    } as const satisfies RegisteredMacroConfigItems;

    /**
     *
     * Macro Module Boilerplate
     *
     **/

    macros!: MacroConfigState<MidiThruModule["macroConfig"]>;

    updateMacroState(macros: MacroConfigState<MidiThruModule["macroConfig"]>) {
        this.macros = macros;
    }

    // state: MidiThruState = {
    //     // hello: true,
    // };

    // internalState: MidiThruInternalState = {
    //     heldNotes: {
    //         inputs: {},
    //         outputs: {},
    //     },
    // };

    /**
     *
     * Boilerplate
     *
     **/

    routes: Record<string, React.ElementType> = {
        // '': MidiThruComponent,
        // 'actions': MidiThruComponent,
        // 'view': MidiThruComponent,
    };

    actions = {
        // hello: () => this.hello(),
    };

    initialize = async () => {
        this.coreDeps.log(`${this.moduleId} module initializing`);
    };

    private hello = () => {
        this.setState({
            // hello: !this.state.hello,
        });
    };

    subject: Subject<MidiThruState> = new Subject();

    Provider: React.ElementType = BaseModule.Provider(this, midiThruContext);
    static use = BaseModule.useModule(midiThruContext);
    private setState = BaseModule.setState(this);

    constructor(private coreDeps: CoreDependencies, private modDeps: ModuleDependencies) {}
}
