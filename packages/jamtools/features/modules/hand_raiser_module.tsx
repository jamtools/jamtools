import React from 'react';

import {jamtools} from '~/core/engine/register';
import {Details} from '~/core/components/Details';

jamtools.registerModule('hand_raiser', {}, async (moduleAPI) => {
    const sliderPositionState1 = await moduleAPI.statesAPI.createSharedState('slider_position_1', 0);
    const sliderPositionState2 = await moduleAPI.statesAPI.createSharedState('slider_position_2', 0);

    const sliderMacro1 = await moduleAPI.deps.module.moduleRegistry.getModule('macro').createMacro(moduleAPI, 'test_cc_1', 'midi_control_change_input', {
        onTrigger: (event => {
            sliderPositionState1.setState(event.event.value!);
        }),
    });

    const sliderMacro2 = await moduleAPI.deps.module.moduleRegistry.getModule('macro').createMacro(moduleAPI, 'test_cc_2', 'midi_control_change_input', {
        onTrigger: (event => {
            sliderPositionState2.setState(event.event.value!);
        }),
    });

    const handleSliderDrag = moduleAPI.createAction('slider_drag', {}, async (args: {index: number, value: number}) => {
        const sliderState = [sliderPositionState1, sliderPositionState2][args.index];
        sliderState.setState(args.value);
    });

    moduleAPI.registerRoute('/', {}, () => {
        const sliderPosition1 = sliderPositionState1.useState();
        const sliderPosition2 = sliderPositionState2.useState();

        return (
            <>
                <Details summary='Macros'>
                    <div>
                        Slider 1
                        <sliderMacro1.components.edit/>
                    </div>

                    <div>
                        Slider 2
                        <sliderMacro2.components.edit/>
                    </div>
                </Details>
                <DataSyncRootRoute
                    sliderPosition1={sliderPosition1}
                    sliderPosition2={sliderPosition2}
                    handleSliderDrag={(index, value) => handleSliderDrag({index, value})}
                />
            </>
        );
    });
});

type DataSyncRootRouteProps = {
    sliderPosition1: number;
    sliderPosition2: number;
    handleSliderDrag: (index: 0 | 1, value: number) => void;
}

const DataSyncRootRoute = ({sliderPosition1, sliderPosition2, handleSliderDrag}: DataSyncRootRouteProps) => {
    const sliders = ([sliderPosition1, sliderPosition2] as const).map((position, i) => (
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
                onChange={(e) => handleSliderDrag(i as 0 | 1, parseInt(e.target.value))}
                style={{writingMode: 'vertical-rl', direction: 'rtl'}}
            />
            <pre style={{display: 'inline'}}>{position}</pre>
        </div>
    ));

    const sliderHands = [sliderPosition1, sliderPosition2].map((position, i) => (
        <div
            key={i}
            style={{
                display: 'inline-block',
                width: '400px',
                maxWidth: '50%'
            }}
        >
            <img
                style={{
                    width: '200px',
                    position: 'absolute',
                    bottom: position * 4,
                    // background: 'transparent',
                }}
                src='https://static.vecteezy.com/system/resources/previews/046/829/646/original/raised-hand-isolated-on-transparent-background-free-png.png'
            />
        </div>
    ));

    return (
        <div>
            <div>
                {sliders}
            </div>

            <div>
                {sliderHands}
            </div>
        </div>
    );
};
