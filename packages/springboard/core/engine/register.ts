import {Module} from 'springboard/module_registry/module_registry';
import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';
import type {ModuleAPI} from './module_api';
import React from 'react';

export type RegisterRouteOptions = {
    hideApplicationShell?: boolean;
};

export type ModuleCallback<ModuleReturnValue extends object> = (moduleAPI: ModuleAPI) =>
Promise<ModuleReturnValue> | ModuleReturnValue;

export type ClassModuleCallback<T extends object> = (coreDeps: CoreDependencies, modDependencies: ModuleDependencies) =>
Promise<Module<T>> | Module<T>;

export type SpringboardRegistry = {
    /**
     * Register a Springboard module
     *
     * After registering, you'll need to declare the module using interface merging:
     *
     * ```ts
     * declare module 'springboard/module_registry/module_registry' {
     *     interface AllModules {
     *         MyModuleId: MyModule;
     *     }
     * }
     * ```
     */
    registerModule: <ModuleOptions extends RegisterModuleOptions, ModuleReturnValue extends object>(
        moduleId: string,
        options: ModuleOptions,
        cb: ModuleCallback<ModuleReturnValue>,
    ) => void;
    registerClassModule: <T extends object>(cb: ClassModuleCallback<T>) => void;
    registerSplashScreen: (component: React.ComponentType) => void;
    reset: (options?: {keepCalls?: boolean}) => void;
};

export type RegisterModuleOptions = {
    rpcMode?: 'remote' | 'local';
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

let registeredSplashScreen: React.ComponentType | null = null;

const registerSplashScreen = (component: React.ComponentType) => {
    registeredSplashScreen = component;
};

export const getRegisteredSplashScreen = (): React.ComponentType | null => {
    return registeredSplashScreen;
};

export const springboard: SpringboardRegistry = {
    registerModule,
    registerClassModule,
    registerSplashScreen,
    reset: (options?: {keepCalls?: boolean}) => {
        springboard.registerModule = registerModule;
        if (!options?.keepCalls) {
            (registerModule as any).calls = [];
        }

        springboard.registerClassModule = registerClassModule;
        if (!options?.keepCalls) {
            (registerClassModule as any).calls = [];
        }

        registeredSplashScreen = null;
    },
};
