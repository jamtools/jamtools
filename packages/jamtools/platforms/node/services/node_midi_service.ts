import {Subject} from 'rxjs';

import easymidi, {Channel} from 'easymidi';

import {MidiInputEventPayload, MidiService} from '~/core/types/io_types';
import {DeviceInfo, MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';

export class NodeMidiService implements MidiService {
    private inputs: easymidi.Input[] = [];
    private outputs: easymidi.Output[] = [];

    initialize = async () => {
        // this.dawToJT = new easymidi.Input('DAW to JT', true);
        // this.jtToDaw = new easymidi.Output('JT to DAW', true);

        const inputNames = easymidi.getInputs();
        for (const inputName of inputNames) {
            this.initializeMidiInputDevice(inputName);
        }

        const outputNames = easymidi.getOutputs();
        for (const outputName of outputNames) {
            this.initializeMidiOutputDevice(outputName);
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

            const input = new easymidi.Input(inputName);

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

            const handleNoteEvent = (eventType: 'noteon' | 'noteoff', event: easymidi.Note) => {
                const midiEvent: MidiEvent = {
                    type: eventType,
                    channel: event.channel,
                    number: event.note,
                    velocity: event.velocity,
                };

                publishMidiEvent(midiEvent);
            };

            input.on('noteon', (event) => {
                handleNoteEvent('noteon', event);
            });

            input.on('noteoff', (event) => {
                handleNoteEvent('noteoff', event);
            });

            // probably want to use a generic on MidiEvent and MidiEventFull for event types. to have accurate object shapes to expect
            input.on('cc', (event) => {
                const midiEvent: MidiEvent = {
                    type: 'cc',
                    channel: event.channel,
                    number: event.controller,
                    value: event.value,
                    velocity: 0,
                };

                publishMidiEvent(midiEvent);
            });

            this.inputs.push(input);
            // console.log('initialized midi input:', input.name);

        } catch (e) {
            console.error('failed to initialize midi input device', e);
        }
    };

    private initializeMidiOutputDevice = (outputName: string) => {
        try {
            const existingOutputIndex = this.outputs.findIndex(o => o.name === outputName);

            if (existingOutputIndex !== -1) {
                const existingOutput = this.outputs[existingOutputIndex];
                existingOutput?.close();
                this.outputs = [...this.outputs.slice(0, existingOutputIndex), ...this.outputs.slice(existingOutputIndex + 1)];
            }

            const output = new easymidi.Output(outputName);
            this.outputs.push(output);
            // console.log('initialized midi output:', output.name);
        } catch (e) {
            console.error('failed to initialize midi output device', e);
        }
    };

    public send = (deviceName: string, midiEvent: MidiEvent) => {
        const output = this.outputs.find(device => device.name === deviceName);
        if (!output) {
            console.error('Error: attempted to send midi message to nonexistent midi output', deviceName);
            return;
        }

        if (midiEvent.type === 'noteon' || midiEvent.type === 'noteoff') {
            const note: easymidi.Note = {
                channel: midiEvent.channel as Channel,
                note: midiEvent.number,
                velocity: midiEvent.velocity!,
            };

            output.send(midiEvent.type as 'noteon', note);
        } else if (midiEvent.type === 'cc') {
            const cc: easymidi.ControlChange = {
                channel: midiEvent.channel as Channel,
                controller: midiEvent.number,
                value: midiEvent.value!,
            };

            output.send(midiEvent.type, cc);
        }
    };

    onDeviceStatusChange = new Subject<DeviceInfo>();

    onInputEvent = new Subject<MidiInputEventPayload>();
}
