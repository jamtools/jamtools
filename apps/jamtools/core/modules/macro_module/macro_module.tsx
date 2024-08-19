import React, {useEffect, useState} from 'react';
import {Module} from '~/module_registry/module_registry';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {FullInputConfig, FullProducedOutput, MacroConfigItemMusicalKeyboardInput, MacroConfigItemMusicalKeyboardOutput, MacroModuleClient, MidiDeviceAndChannelMap, ProducedMacroConfigMusicalKeyboardInput, ProducedMacroConfigMusicalKeyboardOutput, RegisteredMacroConfigItems} from './macro_module_types';
import {MusicalKeyboardInputHandler} from './macro_handlers/musical_keyboard_input_macro_handler';
import {Subject} from 'rxjs';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';

type ModuleId = string;

type MacroConfigState = {
    configs: Record<ModuleId, RegisteredMacroConfigItems>;
    producedMacros: Record<ModuleId, FullProducedOutput<FullInputConfig>>;
};

type MacroHookValue = ModuleHookValue<MacroModule>;

const macroContext = React.createContext<MacroHookValue>({} as MacroHookValue);

type ProviderProps = React.PropsWithChildren<{
    remoteState: MacroConfigState;
}>;

export class MacroModule implements Module<MacroConfigState> {
    moduleId = 'macro';

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {
        // this.musicalKeyboardHandler = new MusicalKeyboardInputHandler(coreDeps, moduleDeps);
    }

    routes = {
        '': () => {
            const mod = MacroModule.use();

            const moduleIds = Object.keys(mod.state.configs);

            return (
                <ul>
                    {moduleIds.map((moduleId) => {
                        const c = mod.state.configs[moduleId];
                        const fieldNames = Object.keys(c);

                        return (
                            <li key={moduleId}>
                                {moduleId}
                                <ul>
                                    {fieldNames.map((fieldName) => {
                                        const mapping = c[fieldName];
                                        const producedMacro = this.state.producedMacros[moduleId][fieldName];
                                        const Component = ((producedMacro as {Component?: React.ElementType}).Component);

                                        return (
                                            <li key={fieldName}>
                                                {Component && <Component />}
                                                {fieldName} - {mapping.type}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        );
                    })}
                </ul>
            );
        },
    };

    state: MacroConfigState = {
        configs: {},
        producedMacros: {},
    };

    initialize = async () => {
        const allConfigs: Record<ModuleId, RegisteredMacroConfigItems> = {};
        const allProducedMacros: Record<ModuleId, FullProducedOutput<FullInputConfig>> = {};

        const mods = this.moduleDeps.moduleRegistry.getModules();
        for (const mod of mods) {
            if (mod.macroConfig) {
                allConfigs[mod.moduleId] = mod.macroConfig;
                const withMacroConfig = mod as Module & MacroModuleClient<any>;
                const producedMacros = await this.registerModuleMacroConfig(withMacroConfig);
                allProducedMacros[mod.moduleId] = producedMacros;
            }
        }

        this.setState({configs: allConfigs, producedMacros: allProducedMacros});
    };

    private registerModuleMacroConfig = async (mod: Module & MacroModuleClient<RegisteredMacroConfigItems>) => {
        const macroConfig = mod.macroConfig as FullInputConfig;
        const producedMacros = {} as FullProducedOutput<typeof macroConfig>;

        const fieldNames = Object.keys(macroConfig);
        for (const fieldName of fieldNames) {
            const conf = macroConfig[fieldName];
            switch (conf.type) {
                case 'musical_keyboard_input':
                    const handler = new MusicalKeyboardInputHandler(mod.moduleId, fieldName, this.coreDeps, this.moduleDeps, conf);
                    await handler.initialize();
                    producedMacros[fieldName] = handler;
                    break;
                case 'musical_keyboard_output':
                    producedMacros[fieldName] = {} as any;
                    break;
                default:
                    this.coreDeps.log(`Unsupported macro config type: ${(conf as {type: string}).type}`);
            }
        }

        mod.updateMacroState(producedMacros);
        return producedMacros;
    };

    private produceMusicalKeyboardOutput = (conf: MacroConfigItemMusicalKeyboardOutput): ProducedMacroConfigMusicalKeyboardOutput => {
        return {} as any;
    };

    subject: Subject<MacroConfigState> = new Subject();

    Provider: React.ElementType = BaseModule.Provider(this, macroContext);
    static use = BaseModule.useModule(macroContext);
    private setState = BaseModule.setState(this);
}
