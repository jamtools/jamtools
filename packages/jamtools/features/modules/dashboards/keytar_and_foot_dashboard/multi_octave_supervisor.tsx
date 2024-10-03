import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';
import {MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {Button} from '../../../../core/components/Button';

export class MultiOctaveSupervisor {
    macros!: Awaited<ReturnType<MultiOctaveSupervisor['createMacros']>>;
    states!: Awaited<ReturnType<MultiOctaveSupervisor['createStates']>>;
    actions!: Awaited<ReturnType<MultiOctaveSupervisor['createActions']>>;

    currentlyHeldNotes: MidiEvent[] = [];

    handleKeyboardNote = async (event: MidiEventFull) => {
        this.macros.pagedOctaveOutput.send(event.event);
        this.states.savedEvent.setState(event);
    };

    render: React.ElementType = () => {
        const [showDebugData, setShowDebugData] = React.useState(false);

        const savedEvent = this.states.savedEvent.useState();

        const debugData = (
            <>
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

        return (
            <>
                {debugData}
            </>
        );
    };

    constructor(private moduleAPI: ModuleAPI, private kvPrefix: string) { }

    initialize = async () => {
        this.macros = await this.createMacros();
        this.states = await this.createStates();
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
        const savedEvent = await this.moduleAPI.statesAPI.createSharedState<MidiEventFull | null>('savedEvent', null);

        return {
            savedEvent,
        };
    };

    createActions = async () => {

    };
}
