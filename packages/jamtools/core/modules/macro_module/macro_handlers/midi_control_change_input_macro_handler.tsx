import React from 'react';
import {Subject} from 'rxjs';

import {jamtools} from '~/core/engine/register';
import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';

type MacroConfigItemMidiControlChangeInput = {
    onTrigger?(midiEvent: MidiEventFull): void;
}

type MidiControlChangeInputResult = {
    subject: Subject<MidiEventFull>;
    components: {
        edit: React.ElementType;
    };
};

declare module '~/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        midi_control_change_input: {
            input: MacroConfigItemMidiControlChangeInput;
            output: MidiControlChangeInputResult;
        }
    }
}

const savedMidiEventsAreEqual = (event1: MidiEventFull, event2: MidiEventFull): boolean => {
    const key1 = getKeyForMidiEvent(event1);
    const key2 = getKeyForMidiEvent(event2);
    return key1 === key2;
};

const getKeyForMidiEvent = (event: MidiEventFull) => {
    return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
};

jamtools.registerMacroType('midi_control_change_input', {}, async (macroAPI, conf, fieldName) => {
    const getKey = (key: string) => `macro|${fieldName}|${key}`;

    const waitingForConfiguration = await macroAPI.moduleAPI.statesAPI.createSharedState(getKey('waiting_for_configuration'), false);
    const capturedMidiEvent = await macroAPI.moduleAPI.statesAPI.createSharedState<MidiEventFull | null>(getKey('captured_midi_event'), null);

    const savedMidiEvents = await macroAPI.moduleAPI.statesAPI.createPersistentState<MidiEventFull[]>(getKey('saved_midi_event'), []);

    const subject = new Subject<MidiEventFull>();

    const createAction = <Args extends object>(actionName: string, cb: (args: Args) => void) => {
        return macroAPI.moduleAPI.createAction(`macro|midi_control_change_input|${fieldName}|${actionName}`, {}, async (args: Args) => {
            return cb(args);
        });
    };

    const toggleWaiting = createAction('toggle_waiting_input', async () => {
        waitingForConfiguration.setState(!waitingForConfiguration.getState());
    });

    const confirmMacro = createAction('confirm_macro', async () => {
        const currentPersisted = savedMidiEvents.getState();
        const captured = capturedMidiEvent.getState();
        if (!captured) {
            throw new Error('tried to confirm macro with none captured');
        }

        if (currentPersisted.find(e => savedMidiEventsAreEqual(e, captured))) {
            throw new Error('already saved that cc control');
        }

        savedMidiEvents.setState([...currentPersisted, captured]);
        waitingForConfiguration.setState(false);
        capturedMidiEvent.setState(null);
    });

    const deleteSavedValue = createAction('delete_saved_event', async (event: MidiEventFull) => {
        const key = getKeyForMidiEvent(event);
        const saved = savedMidiEvents.getState();

        const index = saved.findIndex(e => getKeyForMidiEvent(e) === key);
        if (index === -1) {
            throw new Error(`No saved value for key ${key}`);
        }

        savedMidiEvents.setState([...saved.slice(0, index), ...saved.slice(index + 1)]);
    });

    const askDeleteSavedValue = (event: MidiEventFull) => {
        if (!confirm('delete saved event?')) {
            return;
        }

        deleteSavedValue(event);
    };

    const returnValue: MidiControlChangeInputResult = {
        subject,
        components: {
            edit: () => {
                const waiting = waitingForConfiguration.useState();
                const captured = capturedMidiEvent.useState();
                const saved = savedMidiEvents.useState();

                const captureForm = (
                    <CaptureForm
                        captured={captured}
                        waiting={waiting}
                        confirmMacro={confirmMacro}
                        toggleWaiting={toggleWaiting}
                    />
                );

                const savedValues = (
                    <SavedMacroValues
                        onClickDelete={askDeleteSavedValue}
                        saved={saved}
                    />
                );

                return (
                    <div>
                        {captureForm}
                        {savedValues}
                    </div>
                );
            },
        },
    };

    if (!macroAPI.moduleAPI.deps.core.isMaestro()) {
        return returnValue;
    }

    // make io module support listening for specific midi event types
    // so we can keep subscriptions obvious and lean
    const sub = macroAPI.moduleAPI.deps.module.moduleRegistry.getModule('io').midiInputSubject.subscribe(event => {
        if (event.event.type !== 'cc') {
            return;
        }

        if (waitingForConfiguration.getState()) {
            const captured = capturedMidiEvent.getState();
            if (captured && savedMidiEventsAreEqual(captured, event)) {
                return;
            }

            capturedMidiEvent.setState(event);
            return;
        }

        const key = getKeyForMidiEvent(event);
        const saved = savedMidiEvents.getState();
        if (saved.find(e => getKeyForMidiEvent(e) === key)) {
            subject.next(event);
            conf.onTrigger?.(event);
        }
    });
    macroAPI.onDestroy(sub.unsubscribe);

    return returnValue;
});

type CaptureFormProps = {
    waiting: boolean;
    toggleWaiting: (options: object) => void;
    confirmMacro: (options: object) => void;

    captured: MidiEventFull | null;
}

const CaptureForm = ({waiting, toggleWaiting, confirmMacro, captured}: CaptureFormProps) => {
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

type SavedMacroValues = {
    saved: MidiEventFull[];
    onClickDelete: (event: MidiEventFull) => void;
}

const SavedMacroValues = ({saved, onClickDelete}: SavedMacroValues) => {
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
