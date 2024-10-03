import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';
import {MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {Button} from '~/core/components/Button';

type MultiOctaveSupervisorMidiState = {
    currentlyHeldDownInputNotes: MidiEvent[];
};

export class MultiOctaveSupervisor {
    macros!: Awaited<ReturnType<MultiOctaveSupervisor['createMacros']>>;
    states!: Awaited<ReturnType<MultiOctaveSupervisor['createStates']>>;
    actions!: ReturnType<MultiOctaveSupervisor['createActions']>;

    midiState: MultiOctaveSupervisorMidiState = {
        currentlyHeldDownInputNotes: [],
    };

    handleKeyboardNote = async (event: MidiEventFull) => {
        this.macros.pagedOctaveOutput.send(event.event);

        setTimeout(() => {
            if (this.states.enableDebugging.getState()) {
                this.states.savedEvent.setState(event);
            }
        });
    };

    render: React.ElementType = () => {
        const enableDebugging = this.states.enableDebugging.useState();
        const savedEvent = this.states.savedEvent.useState();

        return (
            <>
                <this.renderDebugData
                    enableDebugging={enableDebugging}
                    savedEvent={savedEvent}
                />
            </>
        );
    };

    private renderDebugData = ({savedEvent, enableDebugging}: {savedEvent: MidiEventFull | null, enableDebugging: boolean}) => {
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
                        <p>Paged octave input:</p>
                        <div>
                            <this.macros.pagedOctaveInput.components.edit />
                        </div>

                        <p>Paged octave output:</p>
                        <div>
                            <this.macros.pagedOctaveOutput.components.edit />
                        </div>

                        {savedEvent && (
                            <pre>
                                {JSON.stringify(savedEvent, null, 2)}
                            </pre>
                        )}
                    </>
                )}
            </>
        );
    };

    constructor(private moduleAPI: ModuleAPI, private kvPrefix: string) { }

    initialize = async () => {
        this.macros = await this.createMacros();
        this.states = await this.createStates();
        this.actions = this.createActions();
    };

    createMacros = async () => {
        const makeMacroName = (name: string) => `${this.kvPrefix}|${name}`;

        const pagedOctaveOutput = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('pagedOctaveOutput'), 'musical_keyboard_output', {});

        const pagedOctaveInput = await this.moduleAPI.createMacro(this.moduleAPI, makeMacroName('pagedOctaveInput'), 'musical_keyboard_paged_octave_input', {
            onTrigger: (event) => {
                this.handleKeyboardNote(event);
            },
        });

        return {
            pagedOctaveInput,
            pagedOctaveOutput,
        } as const;
    };

    createStates = async () => {
        const [
            enableDebugging,
            savedEvent,
            currentlyHeldDownNotes,
        ] = await Promise.all([
            this.moduleAPI.statesAPI.createPersistentState<boolean>('enableDebugging', true),
            this.moduleAPI.statesAPI.createSharedState<MidiEventFull | null>('savedEvent', null),
            this.moduleAPI.statesAPI.createSharedState<MultiOctaveSupervisorMidiState>('currentlyHeldDownNotes', this.midiState),
        ]);

        return {
            enableDebugging,
            savedEvent,
            currentlyHeldDownNotes,
        };
    };

    createActions = () => {
        return {
            toggleDebugging: this.moduleAPI.createAction('toggleDebugging', {}, async () => {
                console.log('toggling debug mode', !this.states.enableDebugging.getState())
                this.states.enableDebugging.setState(!this.states.enableDebugging.getState());
            }),
        };
    };
}
