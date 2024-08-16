import React, {useEffect, useState} from 'react';
import {Module} from '~/module_registry/module_registry';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';
import {FullInputConfig, FullProducedOutput, MacroConfigItemMusicalKeyboardInput, MacroConfigItemMusicalKeyboardOutput, MacroModuleClient, MidiDeviceAndChannelMap, ProducedMacroConfigMusicalKeyboardInput, ProducedMacroConfigMusicalKeyboardOutput, RegisteredMacroConfigItems} from './macro_module_types';
import {MusicalKeyboardInputHandler} from './macro_handlers/musical_keyboard_input_macro_handler';

type ModuleId = string;

type InputEvent = {
    type: InputType;
    device: {

    }
}

type InputType = 'midi' | 'qwerty';

type InputConfig = {
    id: string;
    name: string;
    type: string;
    onTrigger: (config: InputConfig, ) => {};
};

type MacroConfigState = {
    configs: Record<ModuleId, InputConfig[]>;
};

const context = React.createContext<MacroConfigState>({} as MacroConfigState);

type ProviderProps = React.PropsWithChildren<{
    remoteState: MacroConfigState;
}>;

export class MacroModule implements Module {
    moduleId = 'macro';

    constructor(private coreDeps: CoreDependencies, private modDeps: ModuleDependencies) {
        // this.musicalKeyboardHandler = new MusicalKeyboardInputHandler(coreDeps, modDeps);
    }

    initialize = async () => {
        // await this.musicalKeyboardHandler.initialize();

        const mods = this.modDeps.moduleRegistry.getModules();
        for (const mod of mods) {
            if (mod.macroConfig) {
                const withMacroConfig = mod as Module & MacroModuleClient<any>;
                await this.registerModuleMacroConfig(withMacroConfig);
            }
        }
    };

    private registerModuleMacroConfig = async (mod: Module & MacroModuleClient<RegisteredMacroConfigItems>) => {
        const macroConfig = mod.macroConfig as FullInputConfig;
        const producedMacros = {} as FullProducedOutput<typeof macroConfig>;

        const fieldNames = Object.keys(macroConfig);
        for (const fieldName of fieldNames) {
            const conf = macroConfig[fieldName];
            switch (conf.type) {
                case 'musical_keyboard_input':
                    const handler = new MusicalKeyboardInputHandler(mod.moduleId, fieldName, this.coreDeps, this.modDeps, conf);
                    producedMacros[fieldName] = handler.produce;
                    break;
                case 'musical_keyboard_output':
                    producedMacros[fieldName] = () => this.produceMusicalKeyboardOutput(conf);
                    break;
                default:
                    this.coreDeps.log(`Unsupported macro config type: ${(conf as {type: string}).type}`);
            }
        }

        mod.updateMacroState(producedMacros);
    }

    private produceMusicalKeyboardInput = (conf: MacroConfigItemMusicalKeyboardInput): ProducedMacroConfigMusicalKeyboardInput => {
        return {
            type: 'musical_keyboard_input',
        };
    }

    private produceMusicalKeyboardOutput = (conf: MacroConfigItemMusicalKeyboardOutput): ProducedMacroConfigMusicalKeyboardOutput => {
        return {} as any;
    }

    Provider = ({remoteState, children}: ProviderProps) => {
        const [localState, setLocalState] = useState<MacroConfigState>(remoteState);

        useEffect(() => {
            setLocalState(remoteState);
        }, [remoteState]);

        return (
            <context.Provider value={localState}>
                {children}
            </context.Provider>
        );
    };

    // // process a state change from a different module. only runs on the leader device
    // processLeaderStateChange = (moduleId: string, path: string, data: object) => {

    // };

    // this should call `useIo` to get info on available io devices
    MainConfigPage = () => {
        const module = MacroModule.use();

        return (
            <div>
                <h1>Main Config Module</h1>
                <button onClick={() => module.modDeps.toast({
                    target: 'all',
                    message: 'Hello from the main config module!',
                    variant: 'info',
                })}>
                    Show toast
                </button>
            </div>
        );
    };

    static use = (): MacroModule => {
        return {} as any;
        // return new MainConfigModule({toast: console.log});
        // const moduleRegistry = useModuleRegistry();
        // return moduleRegistry.getModule(MainConfigModule.moduleId);
    };
}
