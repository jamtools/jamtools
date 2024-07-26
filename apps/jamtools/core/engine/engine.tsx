import React, {createContext, useContext, useState} from 'react';

import {useMount} from '~/hooks/useMount';
import {ModuleRegistry} from '~/module_registry/module_registry';
import {HelloModule} from '~/modules/hello/hello_module';
import {IoModule} from '~/modules/io/io_module';
import {CoreDependencies, ModuleDependencies} from '~/types/module_types';

export class JamToolsEngine {
    moduleRegistry!: ModuleRegistry;

    constructor(private coreDeps: CoreDependencies) {}

    initialize = async () => {
        this.moduleRegistry = new ModuleRegistry();
        const modDependencies: ModuleDependencies = {
            moduleRegistry: this.moduleRegistry,
            toast: (options) => {
                this.coreDeps.log(options.message);
            },
        };

        const modules = [
            new HelloModule(this.coreDeps, modDependencies),
            new IoModule(this.coreDeps, modDependencies),
        ];

        for (const mod of modules) {
            this.moduleRegistry.registerModule(mod);
        }

        for (const mod of modules) {
            await mod.initialize();
        }
    };
}

export const useJamToolsEngine = () => {
    return useContext(engineContext);
};

type JamToolsProviderProps = React.PropsWithChildren<{
    coreDeps: CoreDependencies;
}>;

const engineContext = createContext<JamToolsEngine>({} as JamToolsEngine);

export const JamToolsProvider = (props: JamToolsProviderProps) => {
    const [engine, setEngine] = useState<JamToolsEngine | null>(null);

    useMount(async () => {
        const e = new JamToolsEngine(props.coreDeps);
        await e.initialize();

        setEngine(e);
    });

    if (!engine) {
        return (
            <div>
                Initializing engine
            </div>
        );
    }

    const mods = engine.moduleRegistry.getModules();

    let stackedProviders: React.ReactNode = props.children;
    for (const mod of mods) {
        const ModProvider = mod.Provider;
        if (ModProvider) {
            stackedProviders = (
                <ModProvider>
                    {stackedProviders}
                </ModProvider>
            );
        }
    }

    return (
        <engineContext.Provider value={engine}>
            {stackedProviders}
        </engineContext.Provider>
    );
};
