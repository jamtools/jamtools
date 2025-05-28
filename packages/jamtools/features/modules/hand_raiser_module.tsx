import {MidiControlChangeInputResult} from '@jamtools/core/modules/macro_module/macro_handlers/inputs/midi_control_change_input_macro_handler';
import React from 'react';

import springboard from 'springboard';

import './hand_raiser.css';

// how to handle local midi device stuff in remote context
// eventually I think this will be done through spawnables

// for now, the macro module will need to manually pivot and make its own concept of spawnables
// the user chooses to use a local midi device, and the macro module takes care of the complexity
// instead of `moduleAPI.createActions`, the module uses `moduleAPI.actions.createHybridAction`
// idk about that actually. it can probably use createActions still, with {client: true} in the call
// but based on user choice, the macro will use remote actions&state, or local actions&state
// so it will use a user agent state supervisor for local

springboard.registerModule('HandRaiser', {}, async (m) => {
    const states = await m.createStates({
        handPositions: [0, 0],
    });

    const actions = m.createActions({
        changeHandPosition: async (args: {index: number, value: number}) => {
            states.handPositions.setStateImmer((positions) => {
                positions[args.index] = args.value;
            });

            return {success: true};
        },
    });

    const macroModule = m.getModule('macro');
    const macros = await macroModule.createMacros(m, {
        slider0: {
            type: 'midi_control_change_input',
            config: {
                onTrigger: (midiEvent => {
                    if (midiEvent.event.value) {
                        actions.changeHandPosition({index: 0, value: midiEvent.event.value});
                    }
                }),
            }
        },
        slider1: {
            type: 'midi_control_change_input',
            config: {
                onTrigger: (midiEvent => {
                    if (midiEvent.event.value) {
                        actions.changeHandPosition({index: 1, value: midiEvent.event.value});
                    }
                }),
            }
        },
    });

    m.registerRoute('/', {}, () => {
        const positions = states.handPositions.useState();

        return (
            <div className='hand-raiser-main'>
                <div className='hand-raiser-center'>
                    {positions.map((position, index) => (
                        <HandSliderContainer
                            key={index}
                            position={position}
                            handlePositionChange={async (value) => {
                                await actions.changeHandPosition({index, value});
                            }}
                            macro={index === 0 ? macros.slider0 : macros.slider1}
                        />
                    ))}
                </div>
            </div>
        );
    });
});

type HandRaiserModuleProps = {
    position: number;
    handlePositionChange: (position: number) => void;
    macro: MidiControlChangeInputResult;
};

const HandSliderContainer = (props: HandRaiserModuleProps) => {
    return (
        <div className='hand-slider-container'>
            <Hand
                position={props.position}
            />
            <div className='slider-container'>
                <Slider
                    value={props.position}
                    onChange={props.handlePositionChange}
                />
                <details style={{cursor: 'pointer'}}>
                    <summary>Configure MIDI</summary>
                    <props.macro.components.edit />
                </details>
            </div>
        </div>
    );
};

type HandProps = {
    position: number;
}

const Hand = (props: HandProps) => {
    const bottomSpace = (props.position / 127) * (100 - 40) + 20;

    return (
        <div
            className='hand'
            style={{
                position: 'absolute',
                bottom: 'calc(' + bottomSpace + 'vh)',
            }}
        >
            <img src='https://static.vecteezy.com/system/resources/previews/046/829/646/original/raised-hand-isolated-on-transparent-background-free-png.png'
            />
        </div>
    );
};

type SliderProps = {
    value: number;
    onChange: (value: number) => void;
}

const Slider = (props: SliderProps) => {
    return (
        <div className='slider'>
            <input
                type='range'
                value={props.value}
                onChange={(e) => props.onChange(parseInt(e.target.value))}
                max={127}
            />
            <pre>{props.value}</pre>
        </div>
    );
};

type DataSyncRootRouteProps = {
    sliderPositions: number[];
    handleSliderDrag: (index: number, value: number) => void;
}

type HandRaiserPageProps = {
    sliderPositions: number[];
    handleSliderDrag: (index: number, value: number) => void;
}

const HandRaiserPage = (props: HandRaiserPageProps) => {
    const {sliderPositions, handleSliderDrag} = props;

    const sliders = sliderPositions.map((position, i) => (
        <Slider
            key={i}
            value={position}
            onChange={newValue => handleSliderDrag(i, newValue)}
        />
    ));

    const sliderHands = sliderPositions.map((position, i) => (
        <Hand
            key={i}
            position={position}
        />
    ));

    return (
        <div>
            <h1>hey</h1>
            <div>
                {sliders}
            </div>

            <div>
                {sliderHands}
            </div>
        </div>
    );
};
