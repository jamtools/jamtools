import {Subject} from 'rxjs';

import {MidiInputEventPayload, MidiService} from '~/types/io_types';

export class BrowserMidiService implements MidiService {
    constructor() {}

    initialize = async () => {
        console.log('TODO: implement browser midi service');
    }

    onInputEvent = new Subject<MidiInputEventPayload>();
}
