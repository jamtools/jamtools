import midi from 'midi-file';

type SustainedNote = {
    midiNumber: number;
    // startTime: number;
    // duration: number;
    // timeSinceLastNoteOn: number;
}

type NoteCluster = {
    notes: SustainedNote[];
}

type ParsedMidiFile = {
    events: NoteCluster[];
}

export class MidiFileParser {
    parseFromBuffer = (input: Buffer | string) => {
        const parsed = midi.parseMidi(input);
        return this.parseFromData(parsed);
    };

    parseFromData = (parsed: midi.MidiData) => {
        let timeOfLastNoteOn = 0;
        let timeSinceLastEvent = 0;
        let currentTime = 0;

        type MidiNumber = number;
        type StartTime = number;

        const currentlyHeldDown = new Map<MidiNumber, StartTime>();

        const result: ParsedMidiFile = {events: []};

        const newResult: {[num: MidiNumber]: {type: string; startTime: number}[]} = {};

        const track = parsed.tracks[0];

        let seenFirstNoteOn = false;

        let currentCluster: NoteCluster = {notes: []};

        for (const event of track) {
            if (seenFirstNoteOn) {
                currentTime += event.deltaTime;
            }

            if (event.type === 'noteOn') {
                if (!seenFirstNoteOn) {
                    seenFirstNoteOn = true;
                }

                const timeSinceLastNoteOn = currentTime - timeOfLastNoteOn;

                if (currentCluster.notes.length) {
                    // handle processing and potentially creation of new cluster

                    if (timeSinceLastNoteOn > 30) {
                        result.events.push(currentCluster);
                        currentCluster = {notes: []};
                    }
                }

                currentCluster.notes.push({
                    midiNumber: event.noteNumber,
                    // duration: 0,
                    // startTime: currentTime,
                    // timeSinceLastNoteOn,
                });

                // result.events.push({notes: [
                //     {
                //         midiNumber: event.noteNumber,
                //         duration: 1,
                //         startTime: currentTime,
                //         timeSinceLastNoteOn: currentTime - timeOfLastNoteOn,
                //     },
                // ]});

                newResult[event.noteNumber] ||= [];
                newResult[event.noteNumber].push({
                    startTime: currentTime,
                    type: event.type,
                });

                timeOfLastNoteOn = currentTime;
            }

            // if (event.type === 'noteOff') {
            //     newResult[event.noteNumber] ||= [];
            //     newResult[event.noteNumber].push({
            //         startTime: currentTime,
            //         type: event.type,
            //     });
            // }
        }

        result.events.push(currentCluster);

        return result;
    };
}
