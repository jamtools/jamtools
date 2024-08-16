import React, {createContext} from 'react';

import {Subject, Subscription} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {Module} from '~/module_registry/module_registry';
import {QwertyCallbackPayload} from '~/types/io_types';

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

    qwertySubscription?: Subscription;
    inputSubject: Subject<QwertyCallbackPayload> = new Subject();

    initialize = async () => {
        this.qwertySubscription = this.coreDeps.inputs.qwerty.onKeyDown.subscribe(event => {
            this.inputSubject.next(event);
        });
    };

    uninitialize = () => {
        this.qwertySubscription?.unsubscribe();
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
