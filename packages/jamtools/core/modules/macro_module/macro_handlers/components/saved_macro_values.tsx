import React from "react";
import {MidiEventFull} from "~/core/modules/macro_module/macro_module_types";
import {getKeyForMidiEvent} from '../macro_handler_utils';

import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';


export type SavedMacroValues = {
    saved: MidiEventFull[];
    onClickDelete: (event: MidiEventFull) => void;
};
export const SavedMacroValues = ({saved, onClickDelete}: SavedMacroValues) => {
    return (
        <ul>
            {saved.map((event) => {
                const key = getKeyForMidiEvent(event);
                return (

                    <li key={key}>
                        {key}
                        <button
                            type='button'
                            onClick={() => onClickDelete(event)}
                        >
                            Delete
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};
