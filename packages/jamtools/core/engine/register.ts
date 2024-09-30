import {Module} from '~/core/module_registry/module_registry';
import {CoreDependencies, ModuleDependencies} from '~/core/types/module_types';
import {ModuleAPI} from './module_api';
import {MacroTypeConfigs} from '~/core/modules/macro_module/macro_module_types';

export type RegisterRouteOptions = {
    hideNavbar?: boolean;
};

type StateSupervisor<State> = {
    state: State;
    setState: (state: State) => Promise<void>;
    useState: () => State;
}

type StatesAPI = {
    createSharedState<State>(stateName: string, initialValue: State): Promise<StateSupervisor<State>>;
    createSessionState(stateName: string): void;
    createPersistentState(stateName: string): void;
    createLocalState(stateName: string): void;
    createLocalStorageState(stateName: string): void;
}

export type MacroOptions = {};

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
    registerMacroType: RegisterMacroType;
    reset: () => void;
};

export type MacroAPI = {
    moduleAPI: ModuleAPI;
    onDestroy: (cb: () => void) => void;
};

export type RegisterMacroTypeOptions = {

}

export type MacroCallback<MacroInputConf extends object, MacroReturnValue extends object> = (macroAPI: MacroAPI, macroInputConf: MacroInputConf, fieldName: string) =>
Promise<MacroReturnValue> | MacroReturnValue;

type RegisterMacroType = <MacroTypeId extends keyof MacroTypeConfigs, MacroTypeOptions extends object>(
    macroTypeId: MacroTypeId,
    options: MacroTypeOptions,
    cb: MacroCallback<MacroTypeConfigs[MacroTypeId]['input'], MacroTypeConfigs[MacroTypeId]['output']>,
) => void;

export type CapturedRegisterMacroTypeCall = [string, RegisterMacroTypeOptions, MacroCallback<any, any>];

const registerMacroType = <MacroOptions extends RegisterMacroTypeOptions, MacroInputConf extends object, MacroReturnValue extends object>(
    macroName: string,
    options: MacroOptions,
    cb: MacroCallback<MacroInputConf, MacroReturnValue>,
) => {
    const calls = (registerMacroType as unknown as {calls: CapturedRegisterMacroTypeCall[]}).calls || [];
    calls.push([macroName, options, cb]);
    (registerMacroType as unknown as {calls: CapturedRegisterMacroTypeCall[]}).calls = calls;
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
    registerMacroType,
    reset: () => {
        jamtools.registerModule = registerModule;
        jamtools.registerClassModule = registerClassModule;
        jamtools.registerMacroType = registerMacroType;
    },
};

(globalThis as unknown as {jamtools: JamTools}).jamtools = jamtools;
