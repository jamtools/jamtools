import {Module} from 'springboard/module_registry/module_registry';
import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';
import type {ModuleAPI} from './module_api';

export type RegisterRouteOptions = {
    hideNavbar?: boolean;
};

export type ModuleCallback<ModuleReturnValue extends object> = (moduleAPI: ModuleAPI) =>
Promise<ModuleReturnValue> | ModuleReturnValue;

export type ClassModuleCallback<T extends object> = (coreDeps: CoreDependencies, modDependencies: ModuleDependencies) =>
Promise<Module<T>> | Module<T>;

export type JamTools = {
    registerModule: <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
        moduleId: string,
        options: ModuleOptions,
        cb: ModuleCallback<ModuleReturnValue>,
    ) => void;
    registerClassModule: <T extends object>(cb: ClassModuleCallback<T>) => void;
    reset: () => void;
};

export type RegisterModuleOptions = {

};

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

export const jamtools: JamTools = {
    registerModule,
    registerClassModule,
    reset: () => {
        jamtools.registerModule = registerModule;
        jamtools.registerClassModule = registerClassModule;
    },
};

(globalThis as unknown as {jamtools: JamTools}).jamtools = jamtools;
