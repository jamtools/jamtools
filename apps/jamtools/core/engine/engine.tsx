import React, {createContext, useContext, useState} from 'react';

import {useMount} from '~/hooks/useMount';
import {Module, ModuleRegistry} from '~/module_registry/module_registry';
import {HelloModule} from '~/modules/hello/hello_module';
import {IoModule} from '~/modules/io/io_module';
import {MacroModule} from '~/modules/macro_module/macro_module';
import {MidiThruModule} from '~/modules/midi_playback/basic_midi_thru/basic_midi_thru_module';
import {WledModule} from '~/modules/wled/wled_module';
import {CoreDependencies, ModuleDependencies} from '~/types/module_types';

export class JamToolsEngine {
    moduleRegistry!: ModuleRegistry;

    constructor(private coreDeps: CoreDependencies) {}

    initialize = async () => {
        await this.coreDeps.inputs.midi.initialize();

        this.moduleRegistry = new ModuleRegistry();
        const modDependencies: ModuleDependencies = {
            moduleRegistry: this.moduleRegistry,
            toast: (options) => {
                this.coreDeps.log(options.message);
            },
            isMaestro: () => true,
            callRpc: async (name: string, args, rpcArgs) => {
                const message = `RPC not implemented. called rpc method '${name}'. ${JSON.stringify(args)} ${JSON.stringify(rpcArgs)}`;
                alert(message);
                return message;
            },
            registerRpc: (name, cb) => {
                const message = `registering rpc method '${name}'`;
                this.coreDeps.log(message);
            },
        };

        const modules = [
            new HelloModule(this.coreDeps, modDependencies),
            new IoModule(this.coreDeps, modDependencies),
            new MacroModule(this.coreDeps, modDependencies),
            new WledModule(this.coreDeps, modDependencies),
            new MidiThruModule(this.coreDeps, modDependencies),
        ];

        for (const mod of modules) {
            if (isModuleEnabled(mod)) {
                this.moduleRegistry.registerModule(mod);
            }
        }

        for (const mod of modules) {
            if (isModuleEnabled(mod)) {
                await mod.initialize();
            }
        }
    };
}

const isModuleEnabled = (mod: Module) => {
    // check if module disabled itself with "enabled = false"
    const maybeEnabled = (mod as {enabled?: boolean}).enabled;
    if (maybeEnabled === false) {
        return false;
    }

    return true;
};

export const useJamToolsEngine = () => {
    return useContext(engineContext);
};

type JamToolsProviderProps = React.PropsWithChildren<{
    coreDeps: CoreDependencies;
}>;

const engineContext = createContext<JamToolsEngine>({} as JamToolsEngine);

export const JamToolsProvider = (props: JamToolsProviderProps) => {
    const [engine, setEngine] = useState<JamToolsEngine | null>(null);

    useMount(async () => {
        const e = new JamToolsEngine(props.coreDeps);
        await e.initialize();

        setEngine(e);
    });

    if (!engine) {
        return (
            <div>
                Initializing engine
            </div>
        );
    }

    const mods = engine.moduleRegistry.getModules();

    let stackedProviders: React.ReactNode = props.children;
    for (const mod of mods) {
        const ModProvider = mod.Provider;
        if (ModProvider) {
            stackedProviders = (
                <ModProvider>
                    {stackedProviders}
                </ModProvider>
            );
        }
    }

    return (
        <engineContext.Provider value={engine}>
            {stackedProviders}
        </engineContext.Provider>
    );
};
