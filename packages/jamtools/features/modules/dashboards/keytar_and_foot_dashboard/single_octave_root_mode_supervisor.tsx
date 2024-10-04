import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';
import {MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {Button} from '~/core/components/Button';

type SingleOctaveRootModeSupervisorMidiState = {
    currentlyHeldDownInputNotes: MidiEvent[];
};

export class SingleOctaveRootModeSupervisor {
    private macros!: Awaited<ReturnType<SingleOctaveRootModeSupervisor['createMacros']>>;
    private states!: Awaited<ReturnType<SingleOctaveRootModeSupervisor['createStates']>>;
    private actions!: ReturnType<SingleOctaveRootModeSupervisor['createActions']>;

    private midiState: SingleOctaveRootModeSupervisorMidiState = {
        currentlyHeldDownInputNotes: [],
    };

    private handleKeyboardNote = async (fullEvent: MidiEventFull) => {
        const event = fullEvent.event;

        this.macros.midiOutput.send(event);

        if (event.type === 'noteon') {
            if (!this.midiState.currentlyHeldDownInputNotes.find(e => e.number === event.number)) {
                this.midiState = {
                    ...this.midiState,
                    currentlyHeldDownInputNotes: [
                        ...this.midiState.currentlyHeldDownInputNotes,
                        event,
                    ],
                };
            }
        }

        if (event.type === 'noteoff') {
            this.midiState = {
                ...this.midiState,
                currentlyHeldDownInputNotes: this.midiState.currentlyHeldDownInputNotes.filter(e => {
                    return e.number !== event.number;
                }),
            };
        }

        setTimeout(() => {
            if (this.states.enableDebugging.getState()) {
                this.states.debugSavedInputEvent.setState(fullEvent);
                this.states.debugMidiState.setState(this.midiState);
            }
        });
    };

    private createActions = () => ({
        toggleDebugging: this.moduleAPI.createAction(`${this.kvPrefix}|toggleDebugging`, {}, async () => {
            console.log('toggling debug mode', !this.states.enableDebugging.getState());
            this.states.enableDebugging.setState(!this.states.enableDebugging.getState());
        }),
    });

    public render: React.ElementType = () => {
        const enableDebugging = this.states.enableDebugging.useState();
        const debugSavedInputEvent = this.states.debugSavedInputEvent.useState();
        const debugMidiState = this.states.debugMidiState.useState();

        return (
            <>
                <this.renderDebugData
                    enableDebugging={enableDebugging}
                    debugSavedInputEvent={debugSavedInputEvent}
                    debugMidiState={debugMidiState}
                />
            </>
        );
    };

    private renderDebugData = ({debugSavedInputEvent, enableDebugging, debugMidiState}: {debugSavedInputEvent: MidiEventFull | null, enableDebugging: boolean, debugMidiState: SingleOctaveRootModeSupervisorMidiState}) => {
        const [showDebugData, setShowDebugData] = React.useState(false);

        return (
            <>
                <Button onClick={() => this.actions.toggleDebugging({})}>
                    {enableDebugging ? 'Disable debugging' : 'Enable debugging'}
                </Button>

                <Button onClick={() => setShowDebugData(!showDebugData)}>
                    {showDebugData ? 'Hide debug data' : 'Show debug data'}
                </Button>

                {showDebugData && (
                    <>
                        <p>Single octave root mode input:</p>
                        <div>
                            <this.macros.singleOctaveInput.components.edit />
                        </div>

                        <p>Single octave output:</p>
                        <div>
                            <this.macros.midiOutput.components.edit />
                        </div>

                        {debugSavedInputEvent && (
                            <pre>
                                {JSON.stringify(debugSavedInputEvent, null, 2)}
                            </pre>
                        )}

                        {debugMidiState && (
                            <pre>
                                {JSON.stringify(debugMidiState, null, 2)}
                            </pre>
                        )}
                    </>
                )}
            </>
        );
    };

    constructor(private moduleAPI: ModuleAPI, private kvPrefix: string) { }

    public initialize = async () => {
        this.macros = await this.createMacros();
        this.states = await this.createStates();
        this.actions = this.createActions();
    };

    private createMacros = async () => {
        const makeMacroName = (name: string) => `${this.kvPrefix}|${name}`;

        const singleOctaveInput = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('singleOctaveInput'), 'musical_keyboard_paged_octave_input', {
            singleOctave: true,
            onTrigger: (event) => {
                this.handleKeyboardNote(event);
            },
        });

        const midiOutput = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('midiOutput'), 'musical_keyboard_output', {});

        return {
            singleOctaveInput,
            midiOutput,
        } as const;
    };

    private createStates = async () => {
        const makeStateName = (name: string) => `${this.kvPrefix}|${name}`;

        const [
            enableDebugging,
            debugSavedInputEvent,
            debugMidiState,
        ] = await Promise.all([
            this.moduleAPI.statesAPI.createPersistentState<boolean>(makeStateName('enableDebugging'), true),
            this.moduleAPI.statesAPI.createSharedState<MidiEventFull | null>(makeStateName('debugSavedInputEvent'), null),
            this.moduleAPI.statesAPI.createSharedState<SingleOctaveRootModeSupervisorMidiState>(makeStateName('debugMidiState'), this.midiState),
        ]);

        return {
            enableDebugging,
            debugSavedInputEvent,
            debugMidiState,
        };
    };
}
