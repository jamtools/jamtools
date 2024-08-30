import {Subject} from 'rxjs';

import {MidiInputEventPayload, MidiService} from '~/core/types/io_types';

export class BrowserMidiService implements MidiService {
    initialize = async () => {
        console.log('TODO: implement browser midi service');
    };

    onInputEvent = new Subject<MidiInputEventPayload>();
}
