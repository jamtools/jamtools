import type {MidiEventFull} from '@jamtools/core/modules/macro_module/macro_module_types';

import SavedMacroValues from './saved_macro_values.lite';
import CaptureForm from './capture_form.lite';
import {Show} from '@builder.io/mitosis';

type EditProps = {
    editing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    waiting: boolean;
    captured: MidiEventFull | null;
    confirmMacro: () => void;
    toggleWaiting: () => void;
    askDeleteSavedValue: (event: MidiEventFull) => void;
    saved: MidiEventFull[];
};
export default function Edit(props: EditProps) {
    return (
        <Show
            when={props.editing}
            else={(
                <div>
                    <button
                        onClick={() => props.onEdit()}
                    >
                        Edit
                    </button>
                    {props.saved.length}
                </div>
            )}
        >
            <div>
                <button
                    onClick={() => props.onCancelEdit()}
                >
                    Cancel
                </button>
                <CaptureForm
                    captured={props.captured}
                    waiting={props.waiting}
                    confirmMacro={() => props.confirmMacro()}
                    toggleWaiting={() => props.toggleWaiting()}
                />
                <SavedMacroValues
                    onClickDelete={(event) => props.askDeleteSavedValue(event)}
                    saved={props.saved}
                />
            </div>
        </Show>
    );
};
