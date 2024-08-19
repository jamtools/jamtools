import React, {createContext} from 'react';

import {Subject} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {Module} from '~/module_registry/module_registry';

import {HelloComponent} from './hello_component';

type HelloState = {
    hello: boolean;
}

type HelloHookValue = ModuleHookValue<HelloModule>;

const helloContext = createContext<HelloHookValue>({} as HelloHookValue);

export class HelloModule implements Module<HelloState> {
    moduleId = 'hello';

    routes: Record<string, React.ElementType> = {
        '': HelloComponent,
        'actions': HelloComponent,
        'view': HelloComponent,
    };

    state: HelloState = {
        hello: true,
    };

    actions = {
        hello: () => this.hello(),
    };

    initialize = async () => {
        this.coreDeps.log('hello module initializing');
    };

    private hello = () => {
        this.setState({
            hello: !this.state.hello,
        });
    };

    subject: Subject<HelloState> = new Subject();

    Provider: React.ElementType = BaseModule.Provider(this, helloContext);
    static use = BaseModule.useModule(helloContext);
    private setState = BaseModule.setState(this);

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}
}
