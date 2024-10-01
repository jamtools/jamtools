import React from 'react';

import {jamtools} from '~/core/engine/register';
import {MidiFileParser, ParsedMidiFile} from '~/core/services/midi_file_parser/midi_file_parser';

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        MidiFile: MidiFileModuleReturnValue;
    }
}

type UploadComponentProps = {
    onParsed: (data: ParsedMidiFile) => void;
}

type MidiFileModuleReturnValue = {
    components: {
        Upload: React.ElementType<UploadComponentProps>;
    };
};

jamtools.registerModule('MidiFile', {}, async (moduleAPI): Promise<MidiFileModuleReturnValue> => {
    return {
        components: {
            Upload: (props: UploadComponentProps) => {
                const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];

                    if (file) {
                        const reader = new FileReader();

                        reader.onload = function (e) {
                            const content = e.target!.result;
                            const parser = new MidiFileParser();
                            if (!content) {
                                console.error('');
                                return;
                            }
                            const parsed = parser.parseWithTonejsMidiBuffer(content as Buffer);
                            props.onParsed(parsed);
                        };

                        reader.readAsArrayBuffer(file);
                    } else {
                        console.error('No file selected');
                    }
                }

                return (
                    <input
                        type='file'
                        onChange={handleFile}
                    />
                );
            },
        },
    };
});
