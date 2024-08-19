import React, {createContext} from 'react';

import {Subject} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../../base_module/base_module';
import {Module} from '~/module_registry/module_registry';
import {MacroModuleClient, MidiDeviceAndChannel, MidiDeviceAndChannelMap, MidiEventFull, RegisteredMacroConfigItems, stubProducedMacros} from '~/modules/macro_module/macro_module_types';

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
};

type MidiThruHookValue = ModuleHookValue<MidiThruModule>;

const midiThruContext = createContext<MidiThruHookValue>({} as MidiThruHookValue);

export class MidiThruModule implements Module<MidiThruState>, MacroModuleClient<MidiThruModule['macroConfig']> {
    moduleId = 'basic_midi_thru';

    macroConfig = {
        myMidiInput: {
            type: 'musical_keyboard_input',
            onTrigger: this.onMidiInput.bind(this),
        },
        myMidiOutput: {
            type: 'musical_keyboard_output',
        },
    } as const satisfies RegisteredMacroConfigItems;

    private onMidiInput(midiEvent: MidiEventFull) {
        this.macros.myMidiOutput.send(midiEvent.event);
    }

    /**
     *
     * Macro Module Boilerplate
     *
     **/

    macros = stubProducedMacros(this.macroConfig);
    updateMacroState(macros: typeof this.macros) {this.macros = macros;}

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

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}
}
