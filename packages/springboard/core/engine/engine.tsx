import {ScaleLoader} from 'react-spinners';

import {CoreDependencies, ModuleDependencies} from 'jamtools-core/types/module_types';

import {ClassModuleCallback, ModuleCallback, RegisterModuleOptions, jamtools} from './register';

import React, {createContext, useContext, useState} from 'react';

import {useMount} from 'jamtools-core/hooks/useMount';
import {ExtraModuleDependencies, Module, ModuleRegistry} from 'jamtools-core/module_registry/module_registry';

import {SharedStateService} from '../services/states/shared_state_service';
import {ModuleAPI} from './module_api';

type CapturedRegisterModuleCalls = [string, RegisterModuleOptions, ModuleCallback<any>];
type CapturedRegisterClassModuleCalls = ClassModuleCallback<any>;

export class JamToolsEngine {
    public moduleRegistry!: ModuleRegistry;

    constructor(public coreDeps: CoreDependencies, public extraModuleDependencies: ExtraModuleDependencies) {}

    private initializeCallbacks: (() => void)[] = [];

    private sharedStateService!: SharedStateService;

    initialize = async () => {
        // how can we make sure each thing is initialized without adding more stuff here? maybe this is best for now
        await this.coreDeps.inputs.midi.initialize();
        const websocketConnected = await this.coreDeps.rpc.initialize();
        if (!websocketConnected) {
            if ('confirm' in globalThis) {
                if (confirm('failed to connect to websocket server. run in local browser mode?')) {
                    this.coreDeps.isMaestro = () => true;
                }
            }
        }

        this.sharedStateService = new SharedStateService(this.coreDeps);

        this.moduleRegistry = new ModuleRegistry();

        const registeredClassModuleCallbacks = (jamtools.registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls || [];
        jamtools.registerClassModule = this.registerClassModule;

        const registeredModuleCallbacks = (jamtools.registerModule as unknown as {calls: CapturedRegisterModuleCalls[]}).calls || [];
        jamtools.registerModule = this.registerModule;

        for (const modClassCallback of registeredClassModuleCallbacks) {
            await this.registerClassModule(modClassCallback);
        }

        for (const modFuncCallback of registeredModuleCallbacks) {
            await this.registerModule(modFuncCallback[0], modFuncCallback[1], modFuncCallback[2]);
        }

        for (const cb of this.initializeCallbacks) {
            cb();
        }
    };

    public registerModule = async <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
        moduleId: string,
        options: ModuleOptions,
        cb: ModuleCallback<ModuleReturnValue>,
    ): Promise<{
        module: Module;
        api: ModuleReturnValue
    }> => {
        const mod: Module = {moduleId};
        const moduleAPI = new ModuleAPI(mod, 'engine', this.coreDeps, this.makeDerivedDependencies(), this.extraModuleDependencies);
        const moduleReturnValue = await cb(moduleAPI);

        Object.assign(mod, moduleReturnValue);

        this.moduleRegistry.registerModule(mod);
        return {module: mod, api: moduleReturnValue};
    };

    private makeDerivedDependencies = (): ModuleDependencies => {
        return {
            moduleRegistry: this.moduleRegistry,
            toast: (options) => {
                this.coreDeps.log(options.message);
            },
            rpc: this.coreDeps.rpc,
            services: {
                sharedStateService: this.sharedStateService,
            },
        };
    };

    public registerClassModule = async <T extends object,>(cb: ClassModuleCallback<T>): Promise<Module | null> => {
        const modDependencies = this.makeDerivedDependencies();

        const mod = await Promise.resolve(cb(this.coreDeps, modDependencies));

        const moduleAPI = new ModuleAPI(mod, 'engine', this.coreDeps, modDependencies, this.extraModuleDependencies);

        if (!isModuleEnabled(mod)) {
            return null;
        }

        await mod.initialize?.(moduleAPI);

        this.moduleRegistry.registerModule(mod);

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
            <div style={{textAlign: 'center', marginTop: '50px'}}>
                <ScaleLoader
                    color="#eee"
                    radius={10}
                    height={50}
                    width={20}
                />
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
