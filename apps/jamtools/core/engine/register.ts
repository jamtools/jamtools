import {Module} from '~/module_registry/module_registry';
import {CoreDependencies, ModuleDependencies} from '~/types/module_types';

type RegisterRouteOptions = {};
type RegisterSnackOptions = {};
type SnackCallback = (snackAPI: SnackAPI) => Promise<void>;

type StatesAPI = {
    createSharedState(stateName: string): void;
    createSessionState(stateName: string): void;
    createPersistentState(stateName: string): void;
    createLocalState(stateName: string): void;
    createLocalStorageState(stateName: string): void;
}

type ModuleAPI = {
    registerRoute(routePath: string, options: RegisterRouteOptions, component: React.ElementType): void;
    registerSnack(snackName: string, options: RegisterSnackOptions, cb: SnackCallback): Promise<void>;
    states: StatesAPI;
}

export type MacroOptions = {};

type SnackAPI = {
    createMacro(macroName: string, options: MacroOptions): Promise<void>;
    states: StatesAPI;
}

export type ModuleCallback<ModuleReturnValue extends object> = (moduleAPI: ModuleAPI) =>
    Promise<ModuleReturnValue> | ModuleReturnValue;

export type ClassModuleCallback<T extends object> = (coreDeps: CoreDependencies, modDependencies: ModuleDependencies) =>
Promise<Module<T>> | Module<T>;

export type JamTools = {
    registerModule: <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
        moduleName: string,
        options: ModuleOptions,
        cb: ModuleCallback<ModuleReturnValue>,
    ) => void;
    registerClassModule: <T extends object>(cb: ClassModuleCallback<T>) => void;
};

export type RegisterModuleOptions = {

};

type CapturedRegisterModuleCalls = [string, RegisterModuleOptions, ModuleCallback<any>];

const registerModule = <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
    moduleName: string,
    options: ModuleOptions,
    cb: ModuleCallback<ModuleReturnValue>,
) => {
    const calls = (registerModule as unknown as {calls: CapturedRegisterModuleCalls[]}).calls || [];
    calls.push([moduleName, options, cb]);
    (registerModule as unknown as {calls: CapturedRegisterModuleCalls[]}).calls = calls;
}

type CapturedRegisterClassModuleCalls = ClassModuleCallback<any>;

const registerClassModule = <T extends object>(cb: ClassModuleCallback<T>) => {
    const calls = (registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls || [];
    calls.push(cb);
    (registerClassModule as unknown as {calls: CapturedRegisterClassModuleCalls[]}).calls = calls;
}

export const jamtools: JamTools = {
    registerModule,
    registerClassModule,
};

(globalThis as unknown as {jamtools: JamTools}).jamtools = jamtools;
