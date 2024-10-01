import React from 'react';

import {jamtools} from '~/core/engine/register';

import {ParsedMidiFile} from '~/core/services/midi_file_parser/midi_file_parser';

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        MidiPlayback: MidiPlaybackModuleReturnValue;
    }
}

type MidiPlaybackModuleReturnValue = {

};

jamtools.registerModule('MidiPlayback', {}, async (moduleAPI): Promise<MidiPlaybackModuleReturnValue> => {
    const midiFileModule = moduleAPI.deps.module.moduleRegistry.getModule('MidiFile');

    const savedMidiFileData = await moduleAPI.statesAPI.createPersistentState<ParsedMidiFile | null>('savedMidiFileData', null);

    const outputDevice = await moduleAPI.createMacro(moduleAPI, 'outputDevice', 'musical_keyboard_output', {});

    let currentIndex = -1;

    const inputTrigger = await moduleAPI.createMacro(moduleAPI, 'inputTrigger', 'midi_button_input', {onTrigger: (event) => {
        if (event.event.type !== 'noteon') {
            return;
        }

        const midiData = savedMidiFileData.getState();
        if (!midiData) {
            throw new Error('no saved midi data');
        }

        currentIndex = (currentIndex + 1) % midiData.events.length;

        const clusterToSend = midiData.events[currentIndex];

        console.log('sending', clusterToSend)

        for (const note of clusterToSend.notes) {
            outputDevice.send({
                type: 'noteon',
                channel: 1,
                number: note.midiNumber,
                velocity: 100, // TODO: record velocity of midi notes from midi file
            });
        }

        setTimeout(() => {
            for (const note of clusterToSend.notes) {
                outputDevice.send({
                    type: 'noteoff',
                    channel: 1,
                    number: note.midiNumber,
                    velocity: 0,
                });
            }
        }, 100);
    }});

    const handleParsedMidiFile = moduleAPI.createAction('handleParsedMidiFile', {}, async (args: {data: ParsedMidiFile}) => {
        savedMidiFileData.setState(args.data);
    });

    moduleAPI.registerRoute('', {hideNavbar: false}, () => {
        const savedState = savedMidiFileData.useState();

        return (
            <div>
                <midiFileModule.components.Upload
                    onParsed={data => handleParsedMidiFile({data})}
                />

                Input trigger:
                <inputTrigger.components.edit/>

                Output device:
                <outputDevice.components.edit/>

                {savedState?.events.map((event, clusterIndex) => (
                    <ul key={clusterIndex} style={{display: 'inline-block', border: '1px solid'}}>
                        {event.notes.map((note, noteIndex) => (
                            <li key={noteIndex}>
                                {note.midiNumber}
                            </li>
                        ))}
                    </ul>
                ))}

                {/* <pre>
                    {JSON.stringify(savedState?.events, null, 2)}
                </pre> */}
            </div>
        );
    });

    return {};
});
