'use client';
import * as React from 'react';

export type SavedMacroValues = {
    saved: MidiEventFull[];
    onClickDelete: (event: MidiEventFull) => void;
};
import type { MidiEventFull } from '@jamtools/core/modules/macro_module/macro_module_types';
const getKeyForMidiEvent = (event: MidiEventFull) => {
    return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
};

function SavedMacroValues(props: SavedMacroValues) {
    return (
        <ul>
            {props.saved?.map((midiEvent) => (
                <li key={getKeyForMidiEvent(midiEvent)}>
                    {getKeyForMidiEvent(midiEvent)}
                    <button onClick={(event) => props.onClickDelete(midiEvent)}>
            Delete
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default SavedMacroValues;
