import React, {useEffect, useState} from 'react';

import {Subject} from 'rxjs';
import {MacroModuleClient} from '~/core/modules/macro_module/macro_module_types';

export type Module<State extends object = any> = {
    moduleId: string;
    initialize?: () => void | Promise<void>;
    Provider?: React.ElementType;
    state?: State;
    subject?: Subject<State>;
    routes?: Record<string, React.ElementType>;
} & Partial<MacroModuleClient<any>>

// this interface is meant to be extended by each individual module file through interface merging
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AllModules {}

type ModuleMap = {[moduleId: string]: Module};

export class ModuleRegistry {
    private modules: Module[] = [];
    private modulesByKey: ModuleMap = {};

    registerModule(mod: Module<any>) {
        this.modules.push(mod);
        this.modulesByKey[mod.moduleId] = mod;

        this.refreshModules();
    }

    async registerAndInitializeModule(mod: Module<any>) {
        this.modules.push(mod);
        this.modulesByKey[mod.moduleId] = mod;
        await mod.initialize?.();

        this.refreshModules();
    }

    getModule<ModuleId extends keyof AllModules>(moduleId: ModuleId): AllModules[ModuleId] {
        return this.modulesByKey[moduleId] as AllModules[ModuleId];
    }

    getCustomModule(moduleId: string): Module | undefined {
        return this.modulesByKey[moduleId];
    }

    refreshModules = () => {
        this.modulesSubject.next([...this.modules]);
    };

    getModules() {
        return this.modules;
    }

    modulesSubject: Subject<Module[]> = new Subject();

    useModules = (): Module[] => {
        return useSubject(this.modules, this.modulesSubject);
    };
}

export const useSubject = <T,>(initialData: T, subject: Subject<T>): T => {
    const [data, setData] = useState(initialData);

    useEffect(() => {
        const subscription = subject.subscribe((newData) => {
            setData(newData);
        });

        return () => subscription.unsubscribe();
    }, []);

    return data;
};
