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
                {(event) => (
                    <li key={getKeyForMidiEvent(event)}>
                        {getKeyForMidiEvent(event)}
                        <button
                           onClick={() => props.onClickDelete(event)}
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
