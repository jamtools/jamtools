import React from 'react';

// import ReactSlider from 'react-slider';

import {jamtools} from '~/core/engine/register';
import {GuitarComponent} from './song_structures/components/guitar';

type TestPersistentState = {
    myvalue: string;
}

const randomString = () => Math.random().toString().slice(2, 4);

jamtools.registerModule('data_sync_test', {}, async (moduleAPI) => {
    const myState = await moduleAPI.states.createPersistentState<TestPersistentState>(
        'my_persistent_state',
        {myvalue: '50'},
    );

    const myAction = moduleAPI.createAction('change_persistent', {}, async () => {
        myState.setState({myvalue: randomString()});
    });

    const ccMacro = moduleAPI.deps.module.moduleRegistry.getModule('macro').createMacro(moduleAPI, 'test_cc', 'midi_control_change_input', {onTrigger: (evt => {
        // console.log('received event from macro', evt.event.value);
    })});

    moduleAPI.registerRoute('/', {}, () => {
        const reactState = myState.useState();

        return (
            <DataSyncRootRoute
                value={reactState}
                onClick={() => myAction({})}
            />
        );
    });
});

const DataSyncRootRoute = ({value, onClick}: {value: TestPersistentState; onClick: (value?: string) => void}) => {
    return (
        <div>
            <pre>
                {JSON.stringify(value)}
            </pre>
            <button onClick={() => onClick()}>
                Send data
            </button>

            <GuitarComponent
                numberOfStrings={4}
                chosenFrets={[
                    // '4-0',
                    // '4-2',
                    // '3-0',
                    // '3-2',
                ]}
            />
        </div>
    );
};
