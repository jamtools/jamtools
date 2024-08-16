import {Subject} from 'rxjs';

export type QwertyCallbackPayload = {
    key: string;
}

export type QwertyService = {
    onKeyDown: Subject<QwertyCallbackPayload>;
    onKeyUp: Subject<QwertyCallbackPayload>;
}
