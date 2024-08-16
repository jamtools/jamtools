import React, {useEffect, useState} from 'react';
import {Module} from '~/module_registry/module_registry';

import {CoreDependencies, ModuleDependencies} from '~/types/module_types';

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
    }

    initialize = () => {

    };

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
