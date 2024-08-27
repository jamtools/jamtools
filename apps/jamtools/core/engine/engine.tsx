import {CoreDependencies, JamTools, ModuleCallback, ModuleDependencies} from '~/types/module_types';

const registeredClassModuleCallbacks: ModuleCallback<any>[] = [];
const registeredFunctionModuleCallbacks: ModuleCallback<any>[] = [];

const jt = {
    registerClassModule: async (cb) => {
        registeredClassModuleCallbacks.push(cb);
    },
    registerModule: async (cb) => {
        registeredFunctionModuleCallbacks.push(cb);
    },
} as JamTools;

(globalThis as unknown as {jamtools: JamTools}).jamtools = jt;

import React, {createContext, useContext, useState} from 'react';

import {useMount} from '~/hooks/useMount';
import {Module, ModuleRegistry} from '~/module_registry/module_registry';

import '~/modules/io/io_module';
import '~/modules/hello/hello_module';
import '~/modules/macro_module/macro_module';
import '~/modules/midi_playback/basic_midi_thru/basic_midi_thru_module';
import '~/modules/wled/wled_module';

export class JamToolsEngine {
    public moduleRegistry!: ModuleRegistry;

    constructor(public coreDeps: CoreDependencies) {}

    private initializeCallbacks: (() => void)[] = [];

    initialize = async () => {
        // how can we make sure each thing is initialized without adding more stuff here? maybe this is best for now
        await this.coreDeps.inputs.midi.initialize();
        await this.coreDeps.rpc.initialize();

        this.moduleRegistry = new ModuleRegistry();
        const modDependencies: ModuleDependencies = {
            moduleRegistry: this.moduleRegistry,
            toast: (options) => {
                this.coreDeps.log(options.message);
            },
            // how can we make it so if the maestro refreshes, they can pick up where the jam was at?
            // maybe we don't support that at first. refreshing maestro is not expected to resume maybe?
            isMaestro: () => true,
            rpc: this.coreDeps.rpc,
        };

        const modules: Module<any>[] = [];

        for (const modClassCallback of registeredClassModuleCallbacks) {
            const mod = await Promise.resolve(modClassCallback(this.coreDeps, modDependencies));
            modules.push(mod);
        }

        for (const mod of modules) {
            if (isModuleEnabled(mod)) {
                this.moduleRegistry.registerModule(mod);
            }
        }

        for (const mod of modules) {
            if (isModuleEnabled(mod)) {
                await mod.initialize?.();
            }
        }

        for (const modFuncCallback of registeredFunctionModuleCallbacks) {
            const mod = await Promise.resolve(modFuncCallback(this.coreDeps, modDependencies));
            this.moduleRegistry.registerModule(mod);
            await mod.initialize?.();
        }

        for (const cb of this.initializeCallbacks) {
            cb();
        }
    };

    public waitForInitialize = (): Promise<void> => {
        return new Promise((resolve) => {
            this.initializeCallbacks.push(() => {
                resolve();
            });
        });
    };
}

const isModuleEnabled = (mod: Module) => {
    // check if module disabled itself with "enabled = false"
    const maybeEnabled = (mod as {enabled?: boolean}).enabled;
    if (maybeEnabled === false) {
        return false;
    }

    return true;
};

export const useJamToolsEngine = () => {
    return useContext(engineContext);
};

type JamToolsProviderProps = React.PropsWithChildren<{
    engine: JamToolsEngine;
}>;

const engineContext = createContext<JamToolsEngine>({} as JamToolsEngine);

export const JamToolsProvider = (props: JamToolsProviderProps) => {
    const [engine, setEngine] = useState<JamToolsEngine | null>(null);

    useMount(async () => {
        await props.engine.initialize();
        setEngine(props.engine);
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
