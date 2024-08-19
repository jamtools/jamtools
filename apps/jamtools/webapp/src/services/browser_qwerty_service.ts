import {Subject} from 'rxjs';

import {QwertyCallbackPayload, QwertyService} from '~/types/io_types';

export class BrowserQwertyService implements QwertyService {
    constructor(document: Document) {
        document.addEventListener('keydown', (event) => {
            this.onInputEvent.next({
                event: 'keydown',
                ...event,
            });
        });

        document.addEventListener('keyup', (event) => {
            this.onInputEvent.next({
                event: 'keyup',
                ...event,
            });
        });
    }

    onInputEvent = new Subject<QwertyCallbackPayload>();
}
