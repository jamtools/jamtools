import React from 'react';

import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';

import {SavedMacroValues} from './saved_macro_values';
import {CaptureForm} from './capture_form';
import {Button} from '~/core/components/Button';

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
export const Edit = (props: EditProps) => {
    if (!props.editing) {
        return (
            <div>
                <Button
                    onClick={props.onEdit}
                >
                    Edit
                </Button>
                {props.saved.length}
            </div>
        );
    }

    const captureForm = (
        <CaptureForm
            captured={props.captured}
            waiting={props.waiting}
            confirmMacro={props.confirmMacro}
            toggleWaiting={props.toggleWaiting}
        />
    );

    const savedValues = (
        <SavedMacroValues
            onClickDelete={props.askDeleteSavedValue}
            saved={props.saved}
        />
    );

    return (
        <div>
            <Button
                onClick={props.onCancelEdit}
            >
                Cancel
            </Button>
            {captureForm}
            {savedValues}
        </div>
    );
};
