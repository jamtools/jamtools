import {Module} from 'springboard/module_registry/module_registry';
import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';
import type {ModuleAPI} from './module_api';

export type RegisterRouteOptions = {
    hideApplicationShell?: boolean;
};

export type ModuleCallback<ModuleReturnValue extends object> = (moduleAPI: ModuleAPI) =>
Promise<ModuleReturnValue> | ModuleReturnValue;

export type ClassModuleCallback<T extends object> = (coreDeps: CoreDependencies, modDependencies: ModuleDependencies) =>
Promise<Module<T>> | Module<T>;

export type SpringboardRegistry = {
    registerModule: <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
        moduleId: string,
        options: ModuleOptions,
        cb: ModuleCallback<ModuleReturnValue>,
    ) => void;
    registerClassModule: <T extends object>(cb: ClassModuleCallback<T>) => void;
    reset: () => void;
    defineModule: <ModuleId extends string, ExternalDependencies extends object, ModuleOptions extends DefineModuleOptions<ExternalDependencies>, ModuleReturnValue extends object>(
        moduleId: ModuleId,
        options: ModuleOptions & {externalDependencies: ExternalDependencies},
        cb: DefineModuleCallback<ModuleReturnValue, ExternalDependencies>,
    ) => DefineModuleFuncReturnValue<ModuleId, ExternalDependencies>;
};

export type DefineModuleCallback<ModuleReturnValue extends object, ExternalDependencies extends object> = (moduleAPI: ModuleAPI, deps: {externalDependencies: ExternalDependencies}) =>
    Promise<ModuleReturnValue> | ModuleReturnValue;

export type RegisterModuleOptions = {

};

export type DefineModuleOptions<ExternalDependencies extends object> = {
    externalDependencies?: ExternalDependencies;
};

export type DefineModuleFuncReturnValue<ModuleId extends string, ExternalDependencies extends object | undefined> = {
    moduleId: ModuleId;
    options: DefineModuleOptions<ExternalDependencies>
    initialize: DefineModuleCallback<any, ExternalDependencies>;
}

const mod = springboard.defineModule('Main', {
    externalDependencies: {
        x: async () => {
            return 'hey'
        }
    },
}, async (m, deps) => {
    deps.externalDependencies.x().then(s => s.length);
});

type RegisterModuleFunc = <ModuleId extends string, ExternalDependencies extends object>(
    definedModule: DefineModuleFuncReturnValue<ModuleId, ExternalDependencies>,
    options?: {
        externalDependencies?: Partial<ExternalDependencies>;
    }
) => {

}

const registerModule2 = <ModuleId extends string, ExternalDependencies extends object>(
    definedModule: DefineModuleFuncReturnValue<ModuleId, ExternalDependencies>,
    options?: {
        externalDependencies?: Partial<ExternalDependencies>,
    },
) => {

}

registerModule2(mod, {
    externalDependencies: {
        x: async () => '',
    },
});

registerModule2(mod);

type CapturedRegisterModuleCall = [string, RegisterModuleOptions, ModuleCallback<any>];

const registerModule = <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
    moduleName: string,
    options: ModuleOptions,
    cb: ModuleCallback<ModuleReturnValue>,
) => {
    const calls = (registerModule as unknown as {calls: CapturedRegisterModuleCall[]}).calls || [];
    calls.push([moduleName, options, cb]);
    (registerModule as unknown as {calls: CapturedRegisterModuleCall[]}).calls = calls;
};

type CapturedRegisterClassModuleCalls = ClassModuleCallback<any>;

const registerClassModule = <T extends object>(cb: ClassModuleCallback<T>) => {
    const calls = (registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls || [];
    calls.push(cb);
    (registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls = calls;
};

export const springboard: SpringboardRegistry = {
    registerModule,
    registerClassModule,
    reset: () => {
        springboard.registerModule = registerModule;
        springboard.registerClassModule = registerClassModule;
    },
    defineModule: (moduleId, options, cb) => {
        return {
            moduleId,
            options,
            initialize: async (moduleAPI, deps) => {
                return cb(moduleAPI, deps);
            },
        }
    },
};

(globalThis as unknown as {springboard: SpringboardRegistry}).springboard = springboard;
