import {Subject} from 'rxjs';

import {MidiInputEventPayload, MidiService} from '~/core/types/io_types';

import {NoteMessageEvent, WebMidi} from 'webmidi';
import {MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';

export class BrowserMidiService implements MidiService {
    private midi!: typeof WebMidi;
    private inputs: typeof WebMidi['inputs'] = [];
    private outputs: typeof WebMidi['outputs'] = [];

    public onInputEvent = new Subject<MidiInputEventPayload>();

    initialize = async () => {
        try {
            this.midi = await WebMidi.enable();
        } catch (e) {
            alert('could nto enable midi: ' + e);
            return;
        }

        for (const input of this.midi.inputs) {
            this.initializeMidiInputDevice(input.name);
        }

        for (const output of this.midi.outputs) {
            // this.initializeMidiOutputDevice(output.name);
        }
    };

    private initializeMidiInputDevice = (inputName: string) => {
        try {
            const existingInputIndex = this.inputs.findIndex(i => i.name === inputName);

            if (existingInputIndex !== -1) {
                const existingInput = this.inputs[existingInputIndex];
                existingInput?.close();
                this.inputs = [...this.inputs.slice(0, existingInputIndex), ...this.inputs.slice(existingInputIndex + 1)];
            }

            const input = this.midi.inputs.find(i => i.name === inputName)!;

            const publishMidiEvent = (event: MidiEvent) => {
                const fullEvent: MidiEventFull = {
                    event,
                    type: 'midi',
                    deviceInfo: {
                        type: 'midi',
                        subtype: 'midi_input',
                        name: input.name,
                        manufacturer: '',
                    },
                };

                this.onInputEvent.next(fullEvent);
            };

            const handleNoteEvent = (eventType: 'noteon' | 'noteoff', event: NoteMessageEvent) => {
                const midiEvent: MidiEvent = {
                    type: eventType,
                    channel: event.message.channel,
                    number: event.note.number,
                    velocity: eventType === 'noteon' ? event.note.rawAttack : 0,
                };

                publishMidiEvent(midiEvent);
            };

            input.addListener('noteon', event => {
                handleNoteEvent('noteon', event);
            });
            // on('noteon', (event) => {
            //     handleNoteEvent('noteon', event);
            // });

            input.addListener('noteoff', event => {
                handleNoteEvent('noteoff', event);
            });

            // probably want to use a generic on MidiEvent and MidiEventFull for event types. to have accurate object shapes to expect
            input.addListener('controlchange', (event) => {
                const midiEvent: MidiEvent = {
                    type: 'cc',
                    channel: event.message.channel,
                    number: event.controller.number,
                    value: event.rawValue!,
                };

                // console.log(midiEvent);

                publishMidiEvent(midiEvent);
            });

            this.inputs.push(input);
            // console.log('initialized midi input:', input.name);

        } catch (e) {
            console.error('failed to initialize midi input device', e);
        }
    };
}
