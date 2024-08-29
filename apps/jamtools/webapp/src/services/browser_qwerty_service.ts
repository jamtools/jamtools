import {Subject} from 'rxjs';

import {QwertyCallbackPayload, QwertyService} from '~/core/types/io_types';

export class BrowserQwertyService implements QwertyService {
    constructor(document: Document) {
        document.addEventListener('keydown', (event) => {
            this.onInputEvent.next({
                event: 'keydown',
                key: event.key.toLowerCase(),
            });
        });

        document.addEventListener('keyup', (event) => {
            this.onInputEvent.next({
                event: 'keyup',
                key: event.key.toLowerCase(),
            });
        });
    }

    onInputEvent = new Subject<QwertyCallbackPayload>();
}
