import {startJamTools} from '../main';

import {NodeQwertyService} from 'jamtools-platforms-node/services/node_qwerty_service';
import {NodeMidiService} from 'jamtools-platforms-node/services/node_midi_service';

const qwerty = new NodeQwertyService();
const midi = new NodeMidiService();

startJamTools({qwerty, midi}).then(async engine => {
    await new Promise(() => {});
});
