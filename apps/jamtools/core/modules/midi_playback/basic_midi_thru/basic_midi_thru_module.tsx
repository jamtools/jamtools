import React, {createContext} from 'react';

import {Subject} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../../base_module/base_module';
import {Module} from '~/module_registry/module_registry';
import {FullProducedOutput, MacroModuleClient, MidiDeviceAndChannel, MidiDeviceAndChannelMap, MidiEventFull} from '~/modules/macro_module/macro_module_types';

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

export class MidiThruModule implements Module<MidiThruState>, MacroModuleClient<MidiThruModule["macroConfig"]> {
    moduleId = 'basic_midi_thru';

    state: MidiThruState = {
        // hello: true,
    };

    internalState: MidiThruInternalState = {
        heldNotes: {
            inputs: {},
            outputs: {},
        },
    };

    macroConfig = {
        input: {
            type: 'musical_keyboard',
            onTrigger: this.handleInputMidiEvent.bind(this),
        },
        output: {
            type: 'musical_keyboard',
            onTrigger: () => {},
        },
    } as const;

    macroConfigState: Partial<FullProducedOutput<MidiThruModule["macroConfig"]>> = {};

    updateMacroConfigState(state: Partial<FullProducedOutput<MidiThruModule["macroConfig"]>>) {
        this.macroConfigState = this.macroConfigState;
    }

    handleInputMidiEvent(evt: MidiEventFull){
        const midiOutput = this.macroConfigState.output;

        // const macroMod = this.modDeps.moduleRegistry.getModule('macro');
        // const device = macroMod.getRegisteredMacros(this.moduleId).output as MidiDeviceAndChannel;
        // const midiOutput = this.modDeps.services.midiService.getOutput(device.device);

        // midiOutput.send(evt);
    }

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
