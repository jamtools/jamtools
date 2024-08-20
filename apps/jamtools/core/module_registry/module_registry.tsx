import React, {useEffect, useState} from 'react';

import {Subject} from 'rxjs';
import {HelloModule} from '~/modules/hello/hello_module';
import {IoModule} from '~/modules/io/io_module';
import {MacroModule} from '~/modules/macro_module/macro_module';
import {MacroModuleClient} from '~/modules/macro_module/macro_module_types';
import {MidiThruModule} from '~/modules/midi_playback/basic_midi_thru/basic_midi_thru_module';
import {WledModule} from '~/modules/wled/wled_module';

export type Module<State extends object = any> = {
    moduleId: string;
    initialize?: () => void | Promise<void>;
    Provider?: React.ElementType;
    state?: State;
    subject?: Subject<State>;
    routes?: Record<string, React.ElementType>;
} & Partial<MacroModuleClient<any>>

export type AllModules = {
    hello: HelloModule;
    io: IoModule;
    wled: WledModule;
    macro: MacroModule;
    midiThru: MidiThruModule;
}

type ModuleMap = {[moduleId: string]: Module};

export class ModuleRegistry {
    private modules: Module[] = [];
    private modulesByKey: ModuleMap = {};

    registerModule(mod: Module<any>) {
        this.modules.push(mod);
        this.modulesByKey[mod.moduleId] = mod;

        this.modulesSubject.next([...this.modules]);
    }

    async registerAndInitializeModule(mod: Module<any>) {
        this.modules.push(mod);
        this.modulesByKey[mod.moduleId] = mod;
        await mod.initialize?.();

        this.modulesSubject.next([...this.modules]);
    }

    getModule<ModuleId extends keyof AllModules>(moduleId: ModuleId): AllModules[ModuleId] {
        return this.modulesByKey[moduleId] as AllModules[ModuleId];
    }

    getModules() {
        return this.modules;
    }

    modulesSubject: Subject<Module[]> = new Subject();

    useModules = (): Module[] => {
        return useSubject(this.modules, this.modulesSubject);
    }
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
