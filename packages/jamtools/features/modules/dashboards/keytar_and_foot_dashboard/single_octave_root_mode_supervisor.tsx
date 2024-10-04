import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';
import {MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {Button} from '~/core/components/Button';
import {ChordChoice} from '~/core/modules/song_structures/components/chord_display';

type SingleOctaveRootModeSupervisorMidiState = {
    currentlyHeldDownInputNotes: MidiEvent[];
    currentSustainingChord: ChordChoice | null;
};

export class SingleOctaveRootModeSupervisor {
    private macros!: Awaited<ReturnType<SingleOctaveRootModeSupervisor['createMacros']>>;
    private states!: Awaited<ReturnType<SingleOctaveRootModeSupervisor['createStates']>>;
    private actions!: ReturnType<SingleOctaveRootModeSupervisor['createActions']>;

    private midiState: SingleOctaveRootModeSupervisorMidiState = {
        currentlyHeldDownInputNotes: [],
        currentSustainingChord: null,
    };

    private handleNoteOnForSustainedKeyboard = (event: MidiEvent) => {
        // uncomment for regular non-chord hold mode
        // this.macros.sustainedOutput.send(event);
        // return

        if (this.midiState.currentSustainingChord) {
            const firstNote = event.number - Math.floor(event.number / 12);
            for (let i = firstNote; i < firstNote + 12; i++) {
                this.macros.sustainedOutput.send({
                    number: i,
                    channel: 1,
                    type: 'noteoff',
                });
            }
        }

        this.macros.sustainedOutput.send(event);

        this.midiState = {
            ...this.midiState,
            currentSustainingChord: {root: event.number % 12, quality: 'major'},
        };
    };

    private handleNoteOffForSustainedKeyboard = (event: MidiEvent) => {
        // no-op
    };

    private handleNoteOnForStaccatoChord = (event: MidiEvent) => {
        // TODO: play chord
        this.macros.stacattoOutput.send(event);
    };

    private handleNoteOffForStaccatoChord = (event: MidiEvent) => {
        // TODO: stop playing chord
        this.macros.stacattoOutput.send(event);
    };

    private handleNoteOnForMonoBass = (event: MidiEvent) => {
        // TODO: make sure this is a good octave. gotta allow octaves on outputs
        this.macros.monoBassOutput.send(event);
    };

    private handleNoteOffForMonoBass = (event: MidiEvent) => {
        this.macros.monoBassOutput.send(event);
    };

    private handleNoteOn = (event: MidiEvent) => {
        this.handleNoteOnForSustainedKeyboard(event);
        this.handleNoteOnForStaccatoChord(event);
        this.handleNoteOnForMonoBass(event);

        if (!this.midiState.currentlyHeldDownInputNotes.find(e => e.number === event.number)) {
            this.midiState = {
                ...this.midiState,
                currentlyHeldDownInputNotes: [
                    ...this.midiState.currentlyHeldDownInputNotes,
                    event,
                ],
            };
        }
    };

    private handleNoteOff = (event: MidiEvent) => {
        this.handleNoteOffForSustainedKeyboard(event);
        this.handleNoteOffForStaccatoChord(event);
        this.handleNoteOffForMonoBass(event);

        this.midiState = {
            ...this.midiState,
            currentlyHeldDownInputNotes: this.midiState.currentlyHeldDownInputNotes.filter(e => {
                return e.number !== event.number;
            }),
        };
    };

    private handleKeyboardNote = async (fullEvent: MidiEventFull) => {
        const event = fullEvent.event;

        if (event.type === 'noteon') {
            this.handleNoteOn(event);
        } else if (event.type === 'noteoff') {
            this.handleNoteOff(event);
        } else {
            return;
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

                        <p>Sustained output:</p>
                        <div>
                            <this.macros.sustainedOutput.components.edit />
                        </div>

                        <p>Sustained output mute:</p>
                        <div>
                            <this.macros.sustainedOutputMute.components.edit />
                        </div>

                        <p>Stacatto output:</p>
                        <div>
                            <this.macros.stacattoOutput.components.edit />
                        </div>

                        <p>Monobass output:</p>
                        <div>
                            <this.macros.monoBassOutput.components.edit />
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

        const sustainedOutputMute = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('sustainedOutputMute'), 'midi_button_input', {
            onTrigger: () => {
                for (let i = 0; i < 84; i++) {
                    this.macros.sustainedOutput.send({
                        number: i,
                        channel: 1,
                        type: 'noteoff',
                    });
                }
            },
        });

        const sustainedOutput = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('sustainedOutput'), 'musical_keyboard_output', {});

        const stacattoOutput = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('stacattoOutput'), 'musical_keyboard_output', {});
        const monoBassOutput = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('monoBassOutput'), 'musical_keyboard_output', {});

        return {
            singleOctaveInput,
            sustainedOutputMute,
            sustainedOutput,
            stacattoOutput,
            monoBassOutput,
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