import React from 'react';

// import ReactSlider from 'react-slider';

import {jamtools} from '~/core/engine/register';
import {GuitarComponent} from './song_structures/components/guitar';

type TestSharedState = {
    myvalue: string;
}

const randomString = () => Math.random().toString().slice(2, 4);

jamtools.registerModule('data_sync_test', {}, async (moduleAPI) => {
    const myState = await moduleAPI.states.createPersistentState<TestSharedState>(
        'my_shared_state',
        {myvalue: '50'},
    );

    moduleAPI.deps.core.rpc.registerRpc('doit', async () => {
        myState.setState({myvalue: randomString()});
    });

    const onClick = (value?: string) => {
        moduleAPI.deps.core.rpc.callRpc('doit', {});
        // myState.setState({myvalue: value || randomString()});
    };

    moduleAPI.registerRoute('', {}, () => {
        const reactState = myState.useState();

        return (
            <DataSyncRootRoute
                value={reactState}
                onClick={onClick}
            />
        );
    });
});

const DataSyncRootRoute = ({value, onClick}: {value: TestSharedState; onClick: (value?: string) => void}) => {
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
