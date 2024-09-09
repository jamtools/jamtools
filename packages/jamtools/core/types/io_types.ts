import {Subject} from 'rxjs';
import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';

export type QwertyCallbackPayload = {
    event: 'keydown' | 'keyup';
    key: string;
}

export type QwertyService = {
    onInputEvent: Subject<QwertyCallbackPayload>;
}

export type MidiInputEventPayload = MidiEventFull;

export type MidiService = {
    onInputEvent: Subject<MidiInputEventPayload>;
    initialize: () => Promise<void>;
    // getAvailableDevices: Subject<MidiInputEventPayload>;
}
