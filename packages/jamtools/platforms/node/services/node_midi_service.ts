import {Subject} from 'rxjs';

import easymidi, {Channel} from 'easymidi';

import {MidiInputEventPayload, MidiService} from '~/core/types/io_types';
import {DeviceInfo, MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {NodeMidiDevicePollerService} from './node_midi/midi_poller';

export class NodeMidiService implements MidiService {
    private inputs: easymidi.Input[] = [];
    private outputs: easymidi.Output[] = [];
    private errorDevices: string[] = [];
    private pollService = new NodeMidiDevicePollerService();

    public onDeviceStatusChange = new Subject<DeviceInfo & {status: 'connected' | 'disconnected'}>();
    public onInputEvent = new Subject<MidiInputEventPayload>();

    private initialized = false;

    public initialize = async () => {
        await this.pollService.initialize();
        await this.pollForConnectedDevices();
    };

    public getInputs = () => {
        return this.inputs.map(i => i.name).filter(d => !d.startsWith('Midi Through') && !d.includes('RtMidi'));
    };

    public getOutputs = () => {
        return this.outputs.map(o => o.name).filter(d => !d.startsWith('Midi Through') && !d.includes('RtMidi'));
    };

    private initializeMidiInputDevice = (inputName: string) => {
        inputName = inputName.trim();
        if (this.errorDevices.includes(inputName)) {
            return;
        }

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
                if (event.velocity === 0) {
                    handleNoteEvent('noteoff', event);
                    return;
                }
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
            console.error('failed to initialize midi input device', inputName);
            this.errorDevices.push(inputName);
        }
    };

    private initializeMidiOutputDevice = (outputName: string) => {
        outputName = outputName.trim();
        if (this.errorDevices.includes(outputName)) {
            return;
        }

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
            console.error('failed to initialize midi output device', outputName);
            this.errorDevices.push(outputName);
        }
    };

    public send = (deviceName: string, midiEvent: MidiEvent) => {
        deviceName = deviceName.trim();
        const output = this.outputs.find(device => device.name === deviceName);
        if (!output) {
            console.error('Error: attempted to send midi message to nonexistent midi output', deviceName);
            return;
        }

        if (midiEvent.type === 'noteon' || midiEvent.type === 'noteoff') {
            let velocity = midiEvent.velocity;
            if (velocity === undefined) {
                velocity = midiEvent.type === 'noteon' ? 100 : 0;
            }

            const note: easymidi.Note = {
                channel: midiEvent.channel as Channel,
                note: midiEvent.number,
                velocity,
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

    private pollForConnectedDevices = async () => {
        const knownDevices = Array.from(new Set(this.inputs.map(i => i.name).concat(this.outputs.map(o => o.name))));
        const result = await this.pollService.pollForDevices(knownDevices);

        for (const device of result.newlyConnectedDevices) {
            if (device.input) {
                this.initializeMidiInputDevice(device.machineReadableName);
            }
            if (device.output) {
                this.initializeMidiOutputDevice(device.machineReadableName);
            }
        }

        for (const device of result.newlyDisconnectedDevices) {
            if (device.input) {
                const index = this.inputs.findIndex(d => d.name === device.machineReadableName);
                if (index !== -1) {
                    this.inputs[index].close();
                    this.inputs = [...this.inputs.slice(0, index), ...this.inputs.slice(index + 1)];
                }
            }
            if (device.output) {
                const index = this.outputs.findIndex(d => d.name === device.machineReadableName);
                if (index !== -1) {
                    this.outputs[index].close();
                    this.outputs = [...this.outputs.slice(0, index), ...this.outputs.slice(index + 1)];
                }
            }
        }

        if (result.newlyConnectedDevices.length || result.newlyDisconnectedDevices.length) {
            if (this.initialized) {
                for (const device of result.newlyConnectedDevices) {
                    this.onDeviceStatusChange.next({
                        manufacturer: '',
                        name: device.humanReadableName,
                        status: 'connected',
                        subtype: 'midi_input',
                        type: 'midi',
                    });
                }
                for (const device of result.newlyDisconnectedDevices) {
                    this.onDeviceStatusChange.next({
                        manufacturer: '',
                        name: device.humanReadableName,
                        status: 'disconnected',
                        subtype: 'midi_input',
                        type: 'midi',
                    });
                }
            }
        }

        this.initialized = true;

        setTimeout(this.pollForConnectedDevices, 2000);
    };
}
