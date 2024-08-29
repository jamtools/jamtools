import {CoreDependencies, JamTools, ModuleCallback, ModuleDependencies} from '~/core/types/module_types';

import {ClassModuleCallback, RegisterModuleOptions, jamtools} from './register';

import React, {createContext, useContext, useState} from 'react';

import {useMount} from '~/core/hooks/useMount';
import {Module, ModuleRegistry} from '~/core/module_registry/module_registry';

import '../modules';
import '../../features/modules';
import '../../features/snacks';

type CapturedRegisterModuleCalls = [string, RegisterModuleOptions, ModuleCallback<any>];
type CapturedRegisterClassModuleCalls = ClassModuleCallback<any>;

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

        const registeredClassModuleCallbacks = (jamtools.registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls || [];
        jamtools.registerClassModule = this.registerClassModule;

        const registeredModuleCallbacks = (jamtools.registerModule as unknown as {calls: CapturedRegisterModuleCalls[]}).calls || [];
        jamtools.registerModule = this.registerModule;

        const modules: Module<any>[] = [];

        for (const modClassCallback of registeredClassModuleCallbacks) {
            const mod = await this.registerClassModule(modClassCallback);
            if (mod) {
                modules.push(mod);
                this.moduleRegistry.registerModule(mod);
            }
        }

        for (const modFuncCallback of registeredModuleCallbacks) {
            const mod = await this.registerModule(modFuncCallback[0], modFuncCallback[1], modFuncCallback[2]);
            if (mod) {
                modules.push(mod);
                this.moduleRegistry.registerModule(mod);
            }
        }

        for (const cb of this.initializeCallbacks) {
            cb();
        }
    };

    public registerModule = async <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
        moduleName: string,
        options: ModuleOptions,
        cb: ModuleCallback<ModuleReturnValue>,
    ) => {
        throw new Error('registerModule not implemented');
    };

    public registerClassModule = async <T extends object,>(cb: ClassModuleCallback<T>): Promise<Module | null> => {
        const modDependencies: ModuleDependencies = {
            moduleRegistry: this.moduleRegistry,
            toast: (options) => {
                this.coreDeps.log(options.message);
            },
            isMaestro: () => true,
            rpc: this.coreDeps.rpc,
        };

        const mod = await Promise.resolve(cb(this.coreDeps, modDependencies));

        if (!isModuleEnabled(mod)) {
            return null;
        }

        await mod.initialize?.();
        return mod;
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
