import {MidiControlChangeInputResult} from '@jamtools/core/modules/macro_module/macro_handlers/inputs/midi_control_change_input_macro_handler';
import React, {useEffect, useMemo, useState} from 'react';

import springboard from 'springboard';

import './hand_raiser.css';

type UserData = {
    userId: string;
    connected: boolean;
    name?: string;
    handPosition: number;
}

springboard.registerModule('HandRaiser', {}, async (m) => {
    const macroModule = m.getModule('macro');
    macroModule.setLocalMode(true);

    const states = await m.createStates({
        roomStateV4: {} as Record<string, UserData>,
    });

    const myHandPosition = await m.statesAPI.createUserAgentState('myHandPosition', 0);

    m.hooks.onUserConnect((user, users) => {
        console.log('onUserConnect', user, users);
        states.roomStateV4.setStateImmer((state) => {
            for (const key of Object.keys(state)) {
                if (!users.find(u => u.id === key)) {
                    delete state[key];
                }
            }

            state[user.id] = {
                userId: user.id,
                name: user.id,
                handPosition: state[user.id]?.handPosition || 0,
                connected: true,
            };
        });
    });

    m.hooks.onUserDisconnect((user, users) => {
        // console.log('onUserDisconnect', user, users);
        states.roomStateV4.setStateImmer((state) => {
            delete state[user.id];
        });
    });

    const actions = m.createActions({
        changeHandPosition: async (args: {value: number}, options, userData) => {
            if (!userData?.userId) {
                return;
            }

            states.roomStateV4.setStateImmer((users) => {
                users[userData.userId].handPosition = args.value;
            });
        },
        getMyUserId: async (args, options, userData) => {
            console.log('getMyUserId', args, options, userData);
            return {
                userId: userData?.userId || '',
            };
        },
    });

    let originalMyId = '';
    if (m.deps.core.rpc.remote.role === 'client') {
        originalMyId = (await actions.getMyUserId()).userId;
    }

    const macros = await macroModule.createMacros(m, {
        handMovingSlider: {
            type: 'midi_control_change_input',
            config: {
                onTrigger: (midiEvent => {
                    if (midiEvent.event.value) {
                        actions.changeHandPosition({value: midiEvent.event.value});
                    }
                }),
            }
        },
    });

    m.registerRoute('/', {}, () => {
        const roomState = states.roomStateV4.useState();
        const [myId, setMyId] = useState(originalMyId);

        const connectedUsers = useMemo(() => Object.values(roomState).filter(u => u.connected), [roomState]);

        useEffect(() => {
            (async () => {
                setMyId((await actions.getMyUserId()).userId);
            })();
        }, [connectedUsers]);

        return (
            <div className='hand-raiser-main'>
                <div className='hand-raiser-center'>
                    <pre>{myId}</pre>
                    {connectedUsers.map((user) => (
                        <>
                            <HandSliderContainer
                                key={user.userId}
                                position={user.handPosition}
                                handlePositionChange={value => actions.changeHandPosition({value})}
                                macro={macros.handMovingSlider}
                                showSlider={user.userId === myId}
                            />
                            <pre>{JSON.stringify(user, null, 2)}</pre>
                        </>
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
    showSlider: boolean;
};

const HandSliderContainer = (props: HandRaiserModuleProps) => {
    return (
        <div className='hand-slider-container'>
            <Hand
                position={props.position}
            />
            {props.showSlider && (
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
            )}
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
