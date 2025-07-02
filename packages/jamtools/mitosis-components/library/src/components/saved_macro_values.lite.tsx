import type {MidiEventFull} from '@jamtools/core/modules/macro_module/macro_module_types';
import {For} from '@builder.io/mitosis';

export type SavedMacroValues = {
    saved: MidiEventFull[];
    onClickDelete: (event: MidiEventFull) => void;
};
export default function SavedMacroValues(props: SavedMacroValues) {
    return (
        <ul>
            <For
                each={props.saved}
            >
                {(midiEvent) => (
                    <li key={getKeyForMidiEvent(midiEvent)}>
                        {getKeyForMidiEvent(midiEvent)}
                        <button
                           onClick={() => props.onClickDelete(midiEvent)}
                        >
                            Delete
                        </button>
                    </li>
                )}
            </For>
        </ul>
    );
};

const getKeyForMidiEvent = (event: MidiEventFull) => {
    return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
};
