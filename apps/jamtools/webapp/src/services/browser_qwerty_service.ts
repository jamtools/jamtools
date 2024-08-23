import {Subject} from 'rxjs';

import {QwertyCallbackPayload, QwertyService} from '~/types/io_types';

export class BrowserQwertyService implements QwertyService {
    constructor(document: Document) {
        document.addEventListener('keydown', (event) => {
            this.onInputEvent.next({
                event: 'keydown',
                key: event.key,
            });
        });

        document.addEventListener('keyup', (event) => {
            this.onInputEvent.next({
                event: 'keyup',
                key: event.key,
            });
        });
    }

    onInputEvent = new Subject<QwertyCallbackPayload>();
}
