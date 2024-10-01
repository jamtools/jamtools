import React from 'react';

import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {getKeyForMidiEvent} from '../input_macro_handler_utils';
import {Button} from '~/core/components/Button';

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
                    <Button
                        onClick={() => toggleWaiting({})}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => confirmMacro({})}
                    >
                        Confirm
                    </Button>
                    <div>
                        Captured:
                        {captured && (
                            <pre data-testid={'captured_event'}>
                                {getKeyForMidiEvent(captured)}
                            </pre>
                        )}
                    </div>
                </>
            ) : (
                <Button
                    onClick={() => toggleWaiting({})}
                >
                    Capture
                </Button>
            )}
        </form>
    );
};
