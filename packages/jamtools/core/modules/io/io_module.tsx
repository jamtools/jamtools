import React, {createContext} from 'react';

import {Subject} from 'rxjs';

import {CoreDependencies, JamTools, ModuleDependencies} from '~/core/types/module_types';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {Module} from '~/core/module_registry/module_registry';
import {MidiInputEventPayload, QwertyCallbackPayload} from '~/core/types/io_types';
import {jamtools} from '~/core/engine/register';

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

    initialize = async () => {
        const qwertySubscription = this.coreDeps.inputs.qwerty.onInputEvent.subscribe(event => {
            this.qwertyInputSubject.next(event);
        }); this.cleanup.push(qwertySubscription.unsubscribe);

        const midiSubscription = this.coreDeps.inputs.midi.onInputEvent.subscribe(event => {
            this.midiInputSubject.next(event);
        }); this.cleanup.push(midiSubscription.unsubscribe);
    };

    onNewMidiDeviceFound = (device: {name: string}) => {
        const existsInConfig = false;
        if (!existsInConfig) {
            this.moduleDeps.toast({
                target: 'all',
                message: `Found new midi device ${device.name}. Want to configure it?`,
                variant: 'info',
                onClick: ['react_gotoMidiDeviceConfigPage', [device.name]],
            });
        }
    };

    subject: Subject<IoState> = new Subject();

    Provider: React.ElementType = BaseModule.Provider(this, ioContext);
    static use = BaseModule.useModule(ioContext);

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}
}
