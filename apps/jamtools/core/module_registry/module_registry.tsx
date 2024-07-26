import React from 'react';

import {Subject} from 'rxjs';
import {HelloModule} from '~/modules/hello/hello_module';
import {IoModule} from '~/modules/io/io_module';

export type Module<State extends object = any> = {
    moduleId: string;
    initialize: () => void | Promise<void>;
    Provider: React.ElementType;
    state?: State;
    subject?: Subject<State>;
    routes?: Record<string, React.ElementType>;
}

export type AllModules = {
    hello: HelloModule;
    io: IoModule;
}

export class ModuleRegistry {
    private modules: Module<any>[] = [];

    registerModule(mod: Module<any>) {
        this.modules.push(mod);
    }

    getModule<ModuleId extends keyof AllModules>(moduleId: ModuleId): AllModules[ModuleId] {
        return this.modules.find(m => m.moduleId === moduleId) as AllModules[ModuleId];
    }

    getModules() {
        return this.modules;
    }
}
