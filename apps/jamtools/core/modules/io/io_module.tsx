import React, {createContext} from 'react';

import {Subject, Subscription} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {Module} from '~/module_registry/module_registry';

type IoState = {
    midiInputDevices: string[];
    midiOutputDevices: string[];
};

type IoHookValue = ModuleHookValue<IoModule>;

const ioContext = createContext<IoHookValue>({} as IoHookValue);

export class IoModule implements Module<IoState> {
    moduleId = 'io';

    routes = {
        '': () => 'io yeah',
    };

    state: IoState = {
        midiInputDevices: [],
        midiOutputDevices: [],
    };

    helloModuleSubscription?: Subscription;

    initialize = async () => {
        const helloModule = this.moduleDeps.moduleRegistry.getModule('hello');

        this.coreDeps.log(`From io module: Original hello state: ${helloModule.state.hello}`);
        this.helloModuleSubscription = helloModule.subject.subscribe(state => {
            this.coreDeps.log(`From io module: New hello state: ${state.hello}`);
        });
    };

    uninitialize = () => {
        this.helloModuleSubscription?.unsubscribe();
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
