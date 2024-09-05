import React from 'react';
import {Module} from '~/core/module_registry/module_registry';

import {CoreDependencies, ModuleDependencies} from '~/core/types/module_types';
import {FullInputConfig, FullProducedOutput, MacroConfigItem, MacroConfigItemMusicalKeyboardInput, MacroConfigItemMusicalKeyboardOutput, MacroInputConfigs, MacroTypeConfigs, ProducedType, ProducedTypeMap, RegisteredMacroConfigItems} from './macro_module_types';
import {Subject} from 'rxjs';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {MacroPage} from './macro_page';
import {CapturedRegisterMacroTypeCall, MacroAPI, MacroCallback, RegisterMacroTypeOptions, jamtools} from '~/core/engine/register';
import {ModuleAPI} from '~/core/engine/module_api';

import './macro_handlers/musical_keyboard_input_macro_handler';
import '~/core/peripherals/outputs/soundfont_peripheral';

type ModuleId = string;

export type MacroConfigState = {
    configs: Record<ModuleId, RegisteredMacroConfigItems>;
    producedMacros: Record<ModuleId, FullProducedOutput<FullInputConfig>>;
};

type MacroHookValue = ModuleHookValue<MacroModule>;

const macroContext = React.createContext<MacroHookValue>({} as MacroHookValue);

jamtools.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new MacroModule(coreDeps, modDependencies);
});

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        macro: MacroModule;
    }
}

export class MacroModule implements Module<MacroConfigState> {
    moduleId = 'macro';

    registeredMacroTypes: CapturedRegisterMacroTypeCall[] = [];

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}

    routes = {
        '': () => {
            const mod = MacroModule.use();
            return <MacroPage state={mod.state} />;
        },
    };

    state: MacroConfigState = {
        configs: {},
        producedMacros: {},
    };

    public createMacro = async <MacroType extends keyof MacroTypeConfigs, T extends MacroConfigItem<MacroType>>(moduleAPI: ModuleAPI, name: string, macroType: MacroType, config: T): Promise<MacroTypeConfigs[MacroType]['output']> => {
        const moduleId = moduleAPI.moduleId;

        const tempConfig = {[name]: {...config, type: macroType}};
        this.state.configs = {...this.state.configs, [moduleId]: {...this.state.configs[moduleId], ...tempConfig}};

        const producedMacros = await this.registerModuleMacroConfig(moduleAPI, tempConfig);
        this.state.producedMacros = {...this.state.producedMacros, [moduleId]: {...this.state.producedMacros[moduleId], ...producedMacros}};

        return producedMacros[name];
    };

    public registerMacroType = <MacroTypeOptions extends object, MacroInputConf extends object, MacroReturnValue extends object>(
        macroName: string,
        options: MacroTypeOptions,
        cb: MacroCallback<MacroInputConf, MacroReturnValue>,
    ) => {
        this.registeredMacroTypes.push([macroName, options, cb]);
    };

    initialize = async () => {
        const registeredMacroCallbacks = (jamtools.registerMacroType as unknown as {calls: CapturedRegisterMacroTypeCall[]}).calls || [];
        jamtools.registerMacroType = this.registerMacroType;

        for (const macroType of registeredMacroCallbacks) {
            this.registerMacroType(...macroType);
        }

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

    private registerModuleMacroConfig = async <T extends RegisteredMacroConfigItems>(moduleAPI: ModuleAPI, macroConfig: T) => {
        const producedMacros = {} as FullProducedOutput<typeof macroConfig>;

        const fieldNames = Object.keys(macroConfig);
        for (const fieldName of fieldNames) {
            const fname = fieldName as keyof typeof macroConfig;
            const conf = macroConfig[fieldName];

            const result = await this.createMacroFromConfigItem(moduleAPI, conf.type, conf, fieldName);
            if (result) {
                producedMacros[fname] = result as ProducedTypeMap[T[keyof T]['type']];
            }
        }

        return producedMacros;
    };

    private createMacroFromConfigItem = async <MacroType extends keyof MacroTypeConfigs>(moduleAPI: ModuleAPI, macroType: MacroType, conf: MacroConfigItem<typeof macroType>, fieldName: string): Promise<MacroTypeConfigs[MacroType]['output'] | undefined> => {
        const registeredMacroType = this.registeredMacroTypes.find(mt => mt[0] === macroType);
        if (!registeredMacroType) {
            return undefined;
        }

        const macroAPI: MacroAPI = {
            moduleAPI,
            onDestroy: (cb: () => void) => {

            },
            reloadMacro: () => {},
        };

        const result = await registeredMacroType[2](macroAPI, conf, fieldName);
        return result;
    };

    subject: Subject<MacroConfigState> = new Subject();

    Provider: React.ElementType = BaseModule.Provider(this, macroContext);
    static use = BaseModule.useModule(macroContext);
    private setState = BaseModule.setState(this);
}
