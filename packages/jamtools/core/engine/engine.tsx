import {CoreDependencies, ModuleDependencies} from '~/core/types/module_types';

import {ClassModuleCallback, ModuleCallback, RegisterModuleOptions, jamtools} from './register';

import React, {createContext, useContext, useState} from 'react';

import {useMount} from '~/core/hooks/useMount';
import {Module, ModuleRegistry} from '~/core/module_registry/module_registry';

import '../modules';
import {SharedStateService} from '../services/states/shared_state_service';
import {ModuleAPI} from './module_api';

type CapturedRegisterModuleCalls = [string, RegisterModuleOptions, ModuleCallback<any>];
type CapturedRegisterClassModuleCalls = ClassModuleCallback<any>;

export class JamToolsEngine {
    public moduleRegistry!: ModuleRegistry;

    constructor(public coreDeps: CoreDependencies) {}

    private initializeCallbacks: (() => void)[] = [];

    private sharedStateService!: SharedStateService;

    initialize = async () => {
        // how can we make sure each thing is initialized without adding more stuff here? maybe this is best for now
        await this.coreDeps.inputs.midi.initialize();
        const websocketConnected = await this.coreDeps.rpc.initialize();
        if (!websocketConnected) {
            // TODO: implement local browser mode
            confirm('failed to connect to websocket server. run in local browser mode?');
        }

        this.sharedStateService = new SharedStateService(this.coreDeps);

        this.moduleRegistry = new ModuleRegistry();

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
        moduleId: string,
        options: ModuleOptions,
        cb: ModuleCallback<ModuleReturnValue>,
    ): Promise<Module> => {
        const mod: Module = {moduleId};
        const moduleAPI = new ModuleAPI(mod, 'engine', this.coreDeps, this.makeDerivedDependencies());
        const moduleReturnValue = await cb(moduleAPI);

        return mod;

        // TODO: expose the arbitrary module callback's return value for usage in other modules
        // this.moduleRegistry.registerModule({moduleId, api: moduleReturnValue});
    };

    private makeDerivedDependencies = (): ModuleDependencies => {
        return {
            moduleRegistry: this.moduleRegistry,
            toast: (options) => {
                this.coreDeps.log(options.message);
            },
            // how can we make it so if the maestro refreshes, they can pick up where the jam was at?
            // maybe we don't support that at first. refreshing maestro is not expected to resume maybe?
            isMaestro: () => true,
            rpc: this.coreDeps.rpc,
            services: {
                sharedStateService: this.sharedStateService,
            },
        };
    };

    public registerClassModule = async <T extends object,>(cb: ClassModuleCallback<T>): Promise<Module | null> => {
        const modDependencies = this.makeDerivedDependencies();

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
