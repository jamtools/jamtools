import React from 'react';
import {Module} from '~/module_registry/module_registry';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {FullInputConfig, FullProducedOutput, MacroConfigItem, MacroConfigItemMusicalKeyboardInput, MacroConfigItemMusicalKeyboardOutput, MacroModuleClient, ProducedMacroConfigMusicalKeyboardOutput, ProducedType, ProducedTypeMap, RegisteredMacroConfigItems} from './macro_module_types';
import {MusicalKeyboardInputHandler} from './macro_handlers/musical_keyboard_input_macro_handler';
import {Subject} from 'rxjs';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {MacroPage} from './macro_page';

type ModuleId = string;

export type MacroConfigState = {
    configs: Record<ModuleId, RegisteredMacroConfigItems>;
    producedMacros: Record<ModuleId, FullProducedOutput<FullInputConfig>>;
};

type MacroHookValue = ModuleHookValue<MacroModule>;

const macroContext = React.createContext<MacroHookValue>({} as MacroHookValue);

type ProviderProps = React.PropsWithChildren<{
    remoteState: MacroConfigState;
}>;

type computeMacros = <T extends RegisteredMacroConfigItems>(cb: () => T) => { [K in keyof T]: ProducedType<T[K]> };

export class MacroModule implements Module<MacroConfigState> {
    moduleId = 'macro';

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {
        // this.musicalKeyboardHandler = new MusicalKeyboardInputHandler(coreDeps, moduleDeps);
    }

    routes = {
        '': () => {
            const mod = MacroModule.use();
            return <MacroPage state={mod.state}/>;
        },
    };

    state: MacroConfigState = {
        configs: {},
        producedMacros: {},
    };

    public createMacros = async <T extends RegisteredMacroConfigItems>(moduleId: string, cb: () => T): Promise<{ [K in keyof T]: ProducedType<T[K]> }> => {
        const config = cb();

        const allConfigs = {...this.state.configs};
        const allProducedMacros = {...this.state.producedMacros};

        allConfigs[moduleId] = config;

        const producedMacros = await this.registerModuleMacroConfig(moduleId, config);
        allProducedMacros[moduleId] = producedMacros;

        return producedMacros;
    };

    public createMacro = async <T extends MacroConfigItem>(name: string, configOrCallback: T | (() => T)): Promise<ProducedType<T> > => {
        const config = typeof configOrCallback === 'function' ? configOrCallback() : configOrCallback;

        const allConfigs = {...this.state.configs};
        const allProducedMacros = {...this.state.producedMacros};

        const tempConfig = {[name]: config};

        const moduleId = '';
        allConfigs[moduleId] = {...allConfigs[moduleId], ...tempConfig};

        const producedMacros = await this.registerModuleMacroConfig(moduleId, tempConfig);
        allProducedMacros[moduleId] = {...allProducedMacros[moduleId], ...producedMacros};

        return producedMacros[name];
    };

    initialize = async () => {
        const allConfigs = {...this.state.configs};
        const allProducedMacros = {...this.state.producedMacros};

        const mods = this.moduleDeps.moduleRegistry.getModules();
        for (const mod of mods) {
            if (mod.macroConfig) {
                allConfigs[mod.moduleId] = mod.macroConfig;
                const producedMacros = await this.registerModuleMacroConfig(mod.moduleId, mod.macroConfig);
                allProducedMacros[mod.moduleId] = producedMacros;
            }
        }

        this.setState({configs: allConfigs, producedMacros: allProducedMacros});
    };

    private registerModuleMacroConfig = async <T extends RegisteredMacroConfigItems>(moduleId: string, macroConfig: T) => {
        const producedMacros = {} as FullProducedOutput<typeof macroConfig>;

        const fieldNames = Object.keys(macroConfig);
        for (const fieldName of fieldNames) {
            const fname = fieldName as keyof typeof macroConfig;
            const conf = macroConfig[fieldName];
            switch (conf.type) {
                case 'musical_keyboard_input': {
                    const handler: ProducedType<typeof conf> = new MusicalKeyboardInputHandler(moduleId, fieldName, this.coreDeps, this.moduleDeps, conf);
                    producedMacros[fname] = handler as ProducedTypeMap<T[keyof T]['type']>;
                    await handler.initialize();
                    break;
                } case 'musical_keyboard_output': {
                    const handler: ProducedType<typeof conf> = {send: (midiEvent) => {
                        // this.coreDeps.log(midiEvent);
                    }, type: 'musical_keyboard_output'};
                    producedMacros[fname] = handler as ProducedTypeMap<T[keyof T]['type']>;
                    break;
                } default:
                    this.coreDeps.log(`Unsupported macro config type: ${(conf as {type: string}).type}`);
            }
        }

        return producedMacros;
    };

    subject: Subject<MacroConfigState> = new Subject();

    Provider: React.ElementType = BaseModule.Provider(this, macroContext);
    static use = BaseModule.useModule(macroContext);
    private setState = BaseModule.setState(this);
}
