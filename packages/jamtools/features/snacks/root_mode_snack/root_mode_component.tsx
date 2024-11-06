import React from 'react';

import {MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS} from 'jamtools-core/constants/midi_number_to_note_name_mappings';
import {ScaleDegreeInfo} from './root_mode_types';

import {Button} from 'jamtools-core/components/Button';

type Props = {
    chord: ScaleDegreeInfo | null;
    scale: number;
    onClick: () => void;
}

export const RootModeComponent = (props: Props) => {
    const scaleRootNoteName = MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS[props.scale as keyof typeof MIDI_NUMBER_TO_NOTE_NAME_MAPPINGS];

    return (
        <div>
            <div>
                Scale: {scaleRootNoteName} Major
            </div>
            <Button onClick={props.onClick}>Change scale</Button>

            {props.chord && (
                <div>
                    {props.chord.noteName} {props.chord.quality}
                </div>
            )}
        </div>
    );
};
