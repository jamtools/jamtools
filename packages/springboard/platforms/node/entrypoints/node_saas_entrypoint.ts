import {Subject} from 'rxjs';

import {MidiService, QwertyService} from '@jamtools/core/types/io_types';
import {startJamTools} from './main';

const qwerty: QwertyService = {
    onInputEvent: new Subject(),
};

const midi: MidiService = {
    getInputs: () => [],
    getOutputs: () => [],
    initialize: async () => {},
    onInputEvent: new Subject(),
    onDeviceStatusChange: new Subject(),
    send: () => {},
};

startJamTools({qwerty, midi}).then(async engine => {
    await new Promise(() => {});
});
