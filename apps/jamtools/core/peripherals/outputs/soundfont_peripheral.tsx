// this file should implement a midi output interface
// and allow the user to choose the soundfont patch to be used, in the UI of the macro chooser
// where does the music_keyboard_input provider come into play here?
// need separation of concerns
// also start doing test driven development

import Soundfont from 'soundfont-player';

import {MidiEvent, OutputMidiDevice, convertMidiNumberToNoteAndOctave} from '~/modules/macro_module/macro_module_types';
import {CoreDependencies, ModuleDependencies} from '~/types/module_types';

type HeldDownSoundfontNotes = {
    number: number;
    player: Soundfont.Player
};

declare module '~/modules/macro_module/macro_module_types' {
    interface ProducedTypeMap {
        musical_keyboard_output: OutputMidiDevice;
    }
}

export class SoundfontPeripheral implements OutputMidiDevice {
    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {

    }

    soundfont!: Soundfont.Player;

    private heldDownNotes: HeldDownSoundfontNotes[] = [];

    public getHeldDownNotes = (): number[] => {
        return this.heldDownNotes.map(n => n.number);
    };

    public initialize = async () => {
        // TODO: serve the soundfont file from origin instead of fetching from CDN. would probably need to fork or do babel transformation since the url is hardcoded
        // https://github.com/danigb/soundfont-player/blob/2b89587d7cc396c5c7b91056f8cb78831ead7436/dist/soundfont-player.js#L76
        this.soundfont = await Soundfont.instrument(new AudioContext(), 'acoustic_grand_piano');
    };

    public send = (midiEvent: MidiEvent) => {
        const midiNumber = midiEvent.number;

        if (midiEvent.type === 'noteon') {
            const noteAndOctave = convertMidiNumberToNoteAndOctave(midiNumber);
            const playingNote = this.soundfont.start(noteAndOctave);

            this.heldDownNotes.push({number: midiNumber, player: playingNote});
            return;
        }

        if (midiEvent.type === 'noteoff') {
            const playingNoteIndex = this.heldDownNotes.findIndex(p => p.number === midiNumber);

            if (playingNoteIndex === -1) {
                return;
            }

            const playingNote = this.heldDownNotes[playingNoteIndex];
            playingNote.player.stop();

            this.heldDownNotes = [
                ...this.heldDownNotes.slice(0, playingNoteIndex),
                ...this.heldDownNotes.slice(playingNoteIndex + 1),
            ];
            return;
        }
    };
}
