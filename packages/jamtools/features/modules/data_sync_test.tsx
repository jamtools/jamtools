import React from 'react';

import {jamtools} from '~/core/engine/register';

// import {GuitarComponent} from './song_structures/components/guitar';

type TestPersistentState = {
    myvalue: string;
}

const randomString = () => Math.random().toString().slice(2, 4);

jamtools.registerModule('data_sync_test', {}, async (moduleAPI) => {
    const myState = await moduleAPI.states.createPersistentState<TestPersistentState>(
        'my_persistent_state',
        {myvalue: '50'},
    );

    const sliderPositionState1 = await moduleAPI.states.createSharedState('slider_position_1', 0);
    const sliderPositionState2 = await moduleAPI.states.createSharedState('slider_position_2', 0);

    const myAction = moduleAPI.createAction('change_persistent', {}, async () => {
        myState.setState({myvalue: randomString()});
    });

    moduleAPI.deps.module.moduleRegistry.getModule('macro').createMacro(moduleAPI, 'test_cc_1', 'midi_control_change_input', {
        onTrigger: (event => {
            if (event.event.value) {
                sliderPositionState1.setState(event.event.value);
            }
        }),
    });

    moduleAPI.deps.module.moduleRegistry.getModule('macro').createMacro(moduleAPI, 'test_cc_2', 'midi_control_change_input', {
        onTrigger: (event => {
            if (event.event.value) {
                sliderPositionState2.setState(event.event.value);
            }
        }),
    });

    moduleAPI.registerRoute('/', {}, () => {
        const reactState = myState.useState();
        const sliderPosition1 = sliderPositionState1.useState();
        const sliderPosition2 = sliderPositionState2.useState();

        return (
            <DataSyncRootRoute
                value={reactState}
                sliderPosition1={sliderPosition1}
                sliderPosition2={sliderPosition2}
                onClick={() => myAction({})}
            />
        );
    });
});

type DataSyncRootRouteProps = {
    value: TestPersistentState;
    sliderPosition1: number;
    sliderPosition2: number;
    onClick: (value?: string) => void;
}

const DataSyncRootRoute = ({value, onClick, sliderPosition1, sliderPosition2}: DataSyncRootRouteProps) => {
    const sliders = [sliderPosition1, sliderPosition2].map((position, i) => (
        <div
            key={i}
            style={{
                display: 'inline-block',
                width: '50px',
            }}
        >
            <input
                type='range'
                value={position}
                onChange={() => { }}
                style={{writingMode: 'vertical-rl', direction: 'rtl'}}
            />
            <pre style={{display: 'inline'}}>{position}</pre>
        </div>
    ));

    return (
        <div>
            <pre>
                {JSON.stringify(value)}
            </pre>
            <button onClick={() => onClick()}>
                Send data
            </button>

            <div>
                {sliders}
            </div>

            {/* <GuitarComponent
                numberOfStrings={4}
                chosenFrets={[
                    // '4-0',
                    // '4-2',
                    // '3-0',
                    // '3-2',
                ]}
            /> */}
        </div>
    );
};
