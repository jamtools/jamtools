import type {MidiEventFull} from '@jamtools/core/modules/macro_module/macro_module_types';

import {Show} from '@builder.io/mitosis';

type CaptureFormProps = {
    waiting: boolean;
    toggleWaiting: (options: object) => void;
    confirmMacro: (options: object) => void;

    captured: MidiEventFull | null;
};
export default function CaptureForm(props: CaptureFormProps) {
    return (
        <div>
            <p>
                Waiting {new String(props.waiting).toString()}
            </p>
            <Show
                when={props.waiting}
                else={(
                    <button
                        onClick={() => props.toggleWaiting({})}
                    >
                        Capture
                    </button>
                )}
            >
                <button
                    onClick={() => props.toggleWaiting({})}
                >
                    Cancel
                </button>
                <button
                    onClick={() => props.confirmMacro({})}
                >
                    Confirm
                </button>
                <div>
                    Captured:
                    <Show
                        when={props.captured}
                    >
                        <pre data-testid={'captured_event'}>
                            {getKeyForMidiEvent(props.captured!)}
                        </pre>
                    </Show>
                </div>
            </Show>
        </div>
    );
};

const getKeyForMidiEvent = (event: MidiEventFull) => {
    return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
};
