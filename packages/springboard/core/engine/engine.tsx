import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';

import {ClassModuleCallback, DefineModuleFuncReturnValue, ModuleCallback, RegisterModuleOptions, springboard} from './register';

import React, {createContext, useContext, useState} from 'react';

import {useMount} from 'springboard/hooks/useMount';
import {ExtraModuleDependencies, Module, ModuleRegistry} from 'springboard/module_registry/module_registry';

import {SharedStateService} from '../services/states/shared_state_service';
import {ModuleAPI} from './module_api';

type CapturedRegisterModuleCalls = [string, RegisterModuleOptions, ModuleCallback<any>];
type CapturedRegisterClassModuleCalls = ClassModuleCallback<any>;

export class Springboard {
    public moduleRegistry!: ModuleRegistry;

    constructor(public coreDeps: CoreDependencies, public extraModuleDependencies: ExtraModuleDependencies) { }

    private initializeCallbacks: (() => void)[] = [];

    private sharedStateService!: SharedStateService;

    initialize = async () => {
        const websocketConnected = await this.coreDeps.rpc.initialize();
        if (!websocketConnected) {
            if ('confirm' in globalThis) {
                if (confirm('failed to connect to websocket server. run in local browser mode?')) {
                    this.coreDeps.isMaestro = () => true;
                }
            }
        }

        this.sharedStateService = new SharedStateService(this.coreDeps);
        await this.sharedStateService.initialize();

        this.moduleRegistry = new ModuleRegistry();

        const registeredClassModuleCallbacks = (springboard.registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls || [];
        springboard.registerClassModule = this.registerClassModule;

        const registeredModuleCallbacks = (springboard.registerModule as unknown as {calls: CapturedRegisterModuleCalls[]}).calls || [];
        springboard.registerModule = this.registerModule;

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

    initialize2 = async () => {
        const websocketConnected = await this.coreDeps.rpc.initialize();
        if (!websocketConnected) {
            if ('confirm' in globalThis) {
                if (confirm('failed to connect to websocket server. run in local browser mode?')) {
                    this.coreDeps.isMaestro = () => true;
                }
            }
        }

        this.sharedStateService = new SharedStateService(this.coreDeps);
        await this.sharedStateService.initialize();

        this.moduleRegistry = new ModuleRegistry();

        const registeredModules = this.preRegisteredModules;
        for (const mod of registeredModules) {
            await this.initializeModule(mod.definedModule, mod.options);
        }


        // const registeredClassModuleCallbacks = (springboard.registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls || [];
        // springboard.registerClassModule = this.registerClassModule;

        // const registeredModuleCallbacks = (springboard.registerModule as unknown as {calls: CapturedRegisterModuleCalls[]}).calls || [];
        // springboard.registerModule = this.registerModule;

        // for (const modClassCallback of registeredClassModuleCallbacks) {
        //     await this.registerClassModule(modClassCallback);
        // }

        // for (const modFuncCallback of registeredModuleCallbacks) {
        //     await this.registerModule(modFuncCallback[0], modFuncCallback[1], modFuncCallback[2]);
        // }

        for (const cb of this.initializeCallbacks) {
            cb();
        }
    };

    preRegisteredModules: {
        definedModule: DefineModuleFuncReturnValue<any, any>;
        options?: {
            externalDependencies?: Partial<any>,
        }
    }[] = [];

    private initializeModule = async <ModuleId extends string, ExternalDependencies extends object | undefined>(
        definedModule: DefineModuleFuncReturnValue<ModuleId, ExternalDependencies>,
        options?: {
            externalDependencies?: Partial<ExternalDependencies>,
        },
    ) => {
        const mod: Module = {moduleId: definedModule.moduleId};
        const moduleAPI = new ModuleAPI(mod, 'engine', this.coreDeps, this.makeDerivedDependencies(), this.extraModuleDependencies);

        const moduleReturnValue = await definedModule.initialize(moduleAPI, definedModule.options?.externalDependencies ? {
            externalDependencies: {
                ...definedModule.options!.externalDependencies!,
                ...options?.externalDependencies,
            },
        }: {externalDependencies: {} as any});

        Object.assign(mod, moduleReturnValue);

        this.moduleRegistry.registerModule(mod);
        return {module: mod, api: moduleReturnValue};
    }

    public registerModule2 = <ModuleId extends string, ExternalDependencies extends object>(
        definedModule: DefineModuleFuncReturnValue<ModuleId, ExternalDependencies>,
        options?: {
            externalDependencies?: Partial<ExternalDependencies>,
        },
    ) => {
        this.preRegisteredModules.push({
            definedModule,
            options,
        });
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

export const useSpringboardEngine = () => {
    return useContext(engineContext);
};

type SpringboardProviderProps = React.PropsWithChildren<{
    engine: Springboard;
}>;

const engineContext = createContext<Springboard>({} as Springboard);

export const SpringboardProvider = (props: SpringboardProviderProps) => {
    const [engine, setEngine] = useState<Springboard | null>(null);

    useMount(async () => {
        await props.engine.initialize();
        setEngine(props.engine);
    });

    if (!engine) {
        return (
            <Loader />
        );
    }

    return (
        <SpringboardProviderPure
            engine={engine}
        >
            {props.children}
        </SpringboardProviderPure>
    );
};

export const SpringboardProviderPure = (props: SpringboardProviderProps) => {
    const {engine} = props;
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

const Loader = () => {
    return (
        <div style={{display: 'flex', justifyContent: 'center', marginTop: '50px'}}>
            Loading...
        </div>
    );
};
