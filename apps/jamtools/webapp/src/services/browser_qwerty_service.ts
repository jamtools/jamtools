import {Subject} from 'rxjs';

import {QwertyService} from '~/types/io_types';

type QwertyCallbackPayload = {
    key: string;
}

export class BrowserQwertyService implements QwertyService {
    constructor(document: Document) {
        document.addEventListener('keydown', (event) => {
            this.onKeyDown.next(event);
        });

        document.addEventListener('keyup', (event) => {
            this.onKeyUp.next(event);
        });
    }

    onKeyDown = new Subject<QwertyCallbackPayload>();
    onKeyUp = new Subject<QwertyCallbackPayload>();
}
