import React from 'react';

import {jamtools} from '~/core/engine/register';
import {ModuleAPI} from '~/core/engine/module_api';
import {Button} from '~/core/components/Button';

type AwaitedRecord<Obj extends Record<string, Promise<any>>> = {
    [Key in keyof Obj]: Awaited<Obj[Key]>;
};

async function promiseAllObject<Obj extends Record<string, Promise<any>>>(
    obj: Obj
): Promise<AwaitedRecord<Obj>> {
    const entries = Object.entries(obj);
    const resolvedValues = await Promise.all(entries.map(([_, promise]) => promise));

    return Object.fromEntries(entries.map(([key], index) => [key, resolvedValues[index]])) as AwaitedRecord<Obj>;
}

const createStates = async (moduleAPI: ModuleAPI) => {
    return promiseAllObject({
        myState: moduleAPI.statesAPI.createSharedState('myState', 'initial state'),
    });
};

const createMacros = async (moduleAPI: ModuleAPI) => {
    return promiseAllObject({
        myMacro: moduleAPI.createMacro(moduleAPI, '', 'midi_button_input', {}),
    });
};

type Actions = {
    changeTheThing: (args: {newValue: string}) => void;
}

jamtools.registerModule('ModuleOrSnackTemplate', {}, async (moduleAPI): Promise<ModuleOrSnackTemplateModuleReturnValue> => {
    const states = await createStates(moduleAPI);
    const macros = await createMacros(moduleAPI);

    const actions: Actions = {
        changeTheThing: moduleAPI.createAction('changeTheThing', {}, async ({newValue}) => {
            states.myState.setState(newValue);
        }),
    };

    registerRoutes(moduleAPI, states, macros, actions);

    const sub = macros.myMacro.subject.subscribe(() => {

    });
    // moduleAPI.onDestroy(sub.unsubscribe);

    return {};
});

type States = Awaited<ReturnType<typeof createStates>>;
type Macros = Awaited<ReturnType<typeof createMacros>>;

const registerRoutes = (moduleAPI: ModuleAPI, states: States, macros: Macros, actions: Actions) => {
    moduleAPI.registerRoute('', {}, () => {
        const myState = states.myState.useState();

        return (
            <div>
                My state: {myState.toString()}
                <Button
                    onClick={() => actions.changeTheThing({
                        newValue: Math.random().toString().slice(2),
                    })}
                >
                    Change value
                </Button>
            </div>
        );
    });
};

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        ModuleOrSnackTemplate: ModuleOrSnackTemplateModuleReturnValue;
    }
}

type ModuleOrSnackTemplateModuleReturnValue = {

};
