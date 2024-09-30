import React, {createContext} from 'react';

import {CoreDependencies, ModuleDependencies} from '~/core/types/module_types';
import {BaseModule, ModuleHookValue} from '../../../core/modules/base_module/base_module';
import {Module} from '~/core/module_registry/module_registry';

import {HelloComponent} from './hello_component';
import {jamtools} from '~/core/engine/register';

type HelloState = {
    hello: boolean;
}

type HelloHookValue = ModuleHookValue<HelloModule>;

const helloContext = createContext<HelloHookValue>({} as HelloHookValue);

jamtools.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new HelloModule(coreDeps, modDependencies);
});

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        hello: HelloModule;
    }
}

export class HelloModule implements Module<HelloState> {
    moduleId = 'hello';

    state: HelloState = {
        hello: true,
    };

    actions = {
        hello: () => this.hello(),
    };

    initialize = async () => {
        return;
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

    Provider: React.ElementType = BaseModule.Provider(this, helloContext);
    static use = BaseModule.useModule(helloContext);
    private setState = BaseModule.setState(this);

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}
}
