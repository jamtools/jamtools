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

    const draftMidiFileData = await moduleAPI.statesAPI.createPersistentState<ParsedMidiFile | null>('draftMidiFileData', null);

    const handleParsedMidiFile = moduleAPI.createAction('handleParsedMidiFile', {}, async (args: {data: ParsedMidiFile}) => {
        draftMidiFileData.setState(args.data);
    });

    moduleAPI.registerRoute('', {hideNavbar: true}, () => {
        const draftState = draftMidiFileData.useState();

        return (
            <div>
                <midiFileModule.components.Upload
                    onParsed={data => handleParsedMidiFile({data})}
                />
                <pre>
                    {JSON.stringify(draftState, null, 2)}
                </pre>
            </div>
        );
    });

    return {};
});
