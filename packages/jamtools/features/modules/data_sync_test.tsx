import React from 'react';

import {jamtools} from '~/core/engine/register';

type TestSharedState = {
    myvalue: string;
}

const randomString = () => Math.random().toString().slice(0, 10);

jamtools.registerModule('data_sync_test', {}, async (moduleAPI) => {
    const sharedState = await moduleAPI.states.createSharedState<TestSharedState>(
        'test_shared_state',
        {myvalue: 'initial value'},
    );

    moduleAPI.deps.core.kvStore

    const onButtonClick = () => {
        sharedState.setState({myvalue: randomString()});
    };

    moduleAPI.registerRoute('', {}, () => {
        const reactState = sharedState.useState();
        return (
            <DataSyncRootRoute
                value={reactState}
                onClick={onButtonClick}
            />
        );
    });
});

const DataSyncRootRoute = ({value, onClick}: {value: TestSharedState; onClick: () => void}) => {
    return (
        <div>
            <pre>
                {JSON.stringify(value)}
            </pre>
            <button onClick={onClick}>
                Send data
            </button>
        </div>
    );
};
