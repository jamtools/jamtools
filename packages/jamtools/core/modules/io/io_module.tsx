import React, {createContext} from 'react';

import {Subject} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from '~/core/types/module_types';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {Module} from '~/core/module_registry/module_registry';
import {MidiInputEventPayload, QwertyCallbackPayload} from '~/core/types/io_types';
import {jamtools} from '~/core/engine/register';
import {SharedStateSupervisor} from '~/core/services/states/shared_state_service';
import {ModuleAPI} from '~/core/engine/module_api';
import {MidiEvent} from '~/core/modules/macro_module/macro_module_types';

type IoState = {
    midiInputDevices: string[];
    midiOutputDevices: string[];
};

type IoHookValue = ModuleHookValue<IoModule>;

const ioContext = createContext<IoHookValue>({} as IoHookValue);

jamtools.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new IoModule(coreDeps, modDependencies);
});

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        io: IoModule;
    }
}

export class IoModule implements Module<IoState> {
    moduleId = 'io';

    cleanup: (() => void)[] = [];

    routes = {
        '': () => 'io yeah',
    };

    state: IoState = {
        midiInputDevices: [],
        midiOutputDevices: [],
    };

    qwertyInputSubject: Subject<QwertyCallbackPayload> = new Subject();
    midiInputSubject: Subject<MidiInputEventPayload> = new Subject();

    midiDeviceState!: SharedStateSupervisor<IoState>;

    initialize = async (moduleAPI: ModuleAPI) => {
        const qwertySubscription = this.coreDeps.inputs.qwerty.onInputEvent.subscribe(event => {
            this.qwertyInputSubject.next(event);
        }); this.cleanup.push(qwertySubscription.unsubscribe);

        const midiSubscription = this.coreDeps.inputs.midi.onInputEvent.subscribe(event => {
            this.midiInputSubject.next(event);
        }); this.cleanup.push(midiSubscription.unsubscribe);

        const inputs = this.coreDeps.inputs.midi.getInputs();
        const outputs = this.coreDeps.inputs.midi.getOutputs();

        const state: IoState = {
            midiInputDevices: inputs,
            midiOutputDevices: outputs,
        };

        this.midiDeviceState = await moduleAPI.statesAPI.createSharedState('plugged_in_midi_devices', state);
    };

    public sendMidiEvent = (outputName: string, midiEvent: MidiEvent) => {
        this.coreDeps.inputs.midi.send(outputName, midiEvent);
    };

    onNewMidiDeviceFound = (deviceInfo: {name: string}) => {
        const existsInConfig = false;
        if (!existsInConfig) {
            this.moduleDeps.toast({
                target: 'all',
                message: `Found new midi device ${deviceInfo.name}. Want to configure it?`,
                variant: 'info',
                onClick: ['react_gotoMidiDeviceConfigPage', [deviceInfo.name]],
            });
        }
    };

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}
}
