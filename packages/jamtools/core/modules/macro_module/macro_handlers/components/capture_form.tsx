import React from 'react';
import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {getKeyForMidiEvent} from '../macro_handler_utils';

type CaptureFormProps = {
    waiting: boolean;
    toggleWaiting: (options: object) => void;
    confirmMacro: (options: object) => void;

    captured: MidiEventFull | null;
};
export const CaptureForm = ({waiting, toggleWaiting, confirmMacro, captured}: CaptureFormProps) => {
    return (
        <form>
            <p>
                Waiting {new String(waiting)}
            </p>
            {waiting ? (
                <>
                    <button
                        onClick={() => toggleWaiting({})}
                        type='button'
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => confirmMacro({})}
                        type='button'
                    >
                        Confirm
                    </button>
                    <div>
                        Captured:
                        <pre>
                            {captured && getKeyForMidiEvent(captured)}
                        </pre>
                    </div>
                </>
            ) : (
                <button
                    onClick={() => toggleWaiting({})}
                    type='button'
                >
                    Capture
                </button>
            )}
        </form>
    );
};
