import React from 'react';
import {Module} from '~/core/module_registry/module_registry';

import {CoreDependencies, ModuleDependencies} from '~/core/types/module_types';
import {MacroConfigItem, MacroTypeConfigs} from './macro_module_types';
import {BaseModule, ModuleHookValue} from '../base_module/base_module';
import {MacroPage} from './macro_page';
import {CapturedRegisterMacroTypeCall, MacroAPI, MacroCallback, jamtools} from '~/core/engine/register';
import {ModuleAPI} from '~/core/engine/module_api';

import './macro_handlers/inputs/musical_keyboard_input_macro_handler';
import './macro_handlers/inputs/midi_control_change_input_macro_handler';
import './macro_handlers/inputs/midi_button_input_macro_handler';
import './macro_handlers/outputs/musical_keyboard_output_macro_handler';
import './macro_handlers/outputs/midi_control_change_output_macro_handler';

type ModuleId = string;

export type MacroConfigState = {
    configs: Record<ModuleId, Record<string, {type: keyof MacroTypeConfigs}>>;
    producedMacros: Record<ModuleId, Record<string, any>>;
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
            return <MacroPage state={mod.state || this.state} />;
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

        const result = await this.createMacroFromConfigItem(moduleAPI, macroType, config, name);

        this.state.producedMacros = {...this.state.producedMacros, [moduleId]: {...this.state.producedMacros[moduleId], [name]: result}};

        if (!result) {
            const errorMessage = `Error: unknown macro type '${macroType}'`;
            this.coreDeps.showError(errorMessage);
        }

        return result!;
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
        this.setState({configs: allConfigs, producedMacros: allProducedMacros});
    };

    private createMacroFromConfigItem = async <MacroType extends keyof MacroTypeConfigs>(moduleAPI: ModuleAPI, macroType: MacroType, conf: MacroConfigItem<typeof macroType>, fieldName: string): Promise<MacroTypeConfigs[MacroType]['output'] | undefined> => {
        const registeredMacroType = this.registeredMacroTypes.find(mt => mt[0] === macroType);
        if (!registeredMacroType) {
            return undefined;
        }

        const savedCallbacks: (() => void)[] = [];

        const macroAPI: MacroAPI = {
            moduleAPI,
            onDestroy: (cb: () => void) => {
                savedCallbacks.push(cb);
            },
        };

        // TODO: call all savedCallbacks on destroy
        // we'll want to store these in the engine
        // or make another class that maintains that state

        const result = await registeredMacroType[2](macroAPI, conf, fieldName);
        return result;
    };

    Provider: React.ElementType = BaseModule.Provider(this, macroContext);
    static use = BaseModule.useModule(macroContext);
    private setState = BaseModule.setState(this);
}
