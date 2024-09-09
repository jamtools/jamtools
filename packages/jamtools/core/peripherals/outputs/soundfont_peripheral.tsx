import Soundfont from 'soundfont-player';
import {jamtools} from '~/core/engine/register';

import {MidiEvent, OutputMidiDevice, convertMidiNumberToNoteAndOctave} from '~/core/modules/macro_module/macro_module_types';
import {CoreDependencies, ModuleDependencies} from '~/core/types/module_types';

type HeldDownSoundfontNotes = {
    number: number;
    player: Soundfont.Player
};

declare module '~/core/modules/macro_module/macro_module_types' {
    interface MacroTypeConfigs {
        musical_keyboard_output: {
            input: MusicalKeyboardOutputMacroConfig;
            output: OutputMidiDevice;
        }
    }
}

type MusicalKeyboardOutputMacroConfig = object;

jamtools.registerMacroType(
    'musical_keyboard_output',
    {x: ''},
    (async (macroAPI, inputConf) => {
        const soundfontResult = new SoundfontPeripheral();
        await soundfontResult.initialize();
        return soundfontResult;
    }),
);

export class SoundfontPeripheral implements OutputMidiDevice {
    constructor() {

    }

    soundfont!: Soundfont.Player;

    private heldDownNotes: HeldDownSoundfontNotes[] = [];

    public getHeldDownNotes = (): number[] => {
        return this.heldDownNotes.map(n => n.number);
    };

    public initialize = async () => {
        // TODO: serve the soundfont file from origin instead of fetching from CDN. would probably need to fork or do babel transformation since the url is hardcoded
        // https://github.com/danigb/soundfont-player/blob/2b89587d7cc396c5c7b91056f8cb78831ead7436/dist/soundfont-player.js#L76

        if (globalThis.AudioContext) {
            this.soundfont = await Soundfont.instrument(new AudioContext(), 'acoustic_grand_piano');
        }

    };

    public send = (midiEvent: MidiEvent) => {
        if (!this.soundfont) {
            console.log('sending midi event from node process');
            return;
        }

        const midiNumber = midiEvent.number;

        if (midiEvent.type === 'noteon') {
            const noteAndOctave = convertMidiNumberToNoteAndOctave(midiNumber);
            const playingNote = this.soundfont.start(noteAndOctave, undefined, {gain: midiEvent.velocity / 32});

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
