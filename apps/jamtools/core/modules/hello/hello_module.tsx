import React, {createContext} from 'react';

import {Subject} from 'rxjs';

import {CoreDependencies, JamTools, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {Module} from '~/module_registry/module_registry';

import {HelloComponent} from './hello_component';
import {jamtools} from '~/engine/register';

type HelloState = {
    hello: boolean;
}

type HelloHookValue = ModuleHookValue<HelloModule>;

const helloContext = createContext<HelloHookValue>({} as HelloHookValue);

jamtools.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new HelloModule(coreDeps, modDependencies);
});

declare module '~/module_registry/module_registry' {
    interface AllModules {
        hello: HelloModule;
    }
}

export class HelloModule implements Module<HelloState> {
    moduleId = 'hello';

    // enabled = false;

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

        this.moduleDeps.rpc.registerRpc('hello', async (args) => {
            this.coreDeps.log('registerRpc hello', args);
            this.hello();
            return {response_from: 'hello module'};
        });

        this.moduleDeps.rpc.callRpc('hello', {sending_from: 'hello module'}).then((result) => {
            this.coreDeps.log('callRpc hello', result);
        });
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
