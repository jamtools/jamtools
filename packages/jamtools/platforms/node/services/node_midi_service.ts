import {Subject} from 'rxjs';

import easymidi, {Channel} from 'easymidi';

import {MidiInputEventPayload, MidiService} from '~/core/types/io_types';
import {DeviceInfo, MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';

export class NodeMidiService implements MidiService {
    private inputs: easymidi.Input[] = [];
    private outputs: easymidi.Output[] = [];
    private errorDevices: string[] = [];

    public onDeviceStatusChange = new Subject<DeviceInfo & {status: 'connected' | 'disconnected'}>();
    public onInputEvent = new Subject<MidiInputEventPayload>();

    public initialize = async () => {
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

        setTimeout(() => {
            setInterval(() => {
                this.pollForConnectedDevices();
            }, 1000);
        }, 2000);
    };

    public getInputs = () => {
        return this.inputs.map(i => i.name);
    };

    public getOutputs = () => {
        return this.outputs.map(o => o.name);
    };

    private initializeMidiInputDevice = (inputName: string) => {
        inputName = inputName.trim();
        if (this.errorDevices.includes(inputName) || inputName.includes('RtMidi')) {
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
        if (this.errorDevices.includes(outputName) || outputName.includes('RtMidi')) {
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

    private pollForConnectedDevices = () => {
        const currentInputs = easymidi.getInputs();
        const currentOutputs = easymidi.getOutputs();

        const knownInputs = this.inputs.map(d => d.name);
        const knownOutputs = this.outputs.map(d => d.name);

        const newlyConnectedInputs = currentInputs.filter(device => !knownInputs.includes(device));
        const newlyDisconnectedInputs = knownInputs.filter(device => !currentInputs.includes(device));

        const newlyConnectedOutputs = currentOutputs.filter(device => !knownOutputs.includes(device));
        const newlyDisconnectedOutputs = knownOutputs.filter(device => !currentOutputs.includes(device));

        if (newlyConnectedInputs.length > 0) {
            console.log('Newly connected MIDI input devices:', newlyConnectedInputs);
            for (const device of newlyConnectedInputs) {
                this.initializeMidiInputDevice(device);
            }
        }

        if (newlyConnectedOutputs.length > 0) {
            console.log('Newly connected MIDI output devices:', newlyConnectedOutputs);
            newlyConnectedOutputs.forEach(this.initialize);
            for (const device of newlyConnectedOutputs) {
                this.initializeMidiOutputDevice(device);
            }
        }

        if (newlyDisconnectedInputs.length > 0) {
            console.log('Disconnected MIDI input devices:', newlyDisconnectedInputs);
            for (const d of newlyDisconnectedInputs) {
                this.inputs.find(i => i.name === d)?.close();
            }
            this.inputs = this.inputs.filter(input => !newlyDisconnectedInputs.includes(input.name));
        }

        if (newlyDisconnectedOutputs.length > 0) {
            console.log('Disconnected MIDI output devices:', newlyDisconnectedOutputs);
            for (const d of newlyDisconnectedOutputs) {
                this.outputs.find(o => o.name === d)?.close();
            }
            this.outputs = this.outputs.filter(output => !newlyDisconnectedOutputs.includes(output.name));
        }

        const publishDeviceStatusChange = (deviceName: string, isConnected: boolean) => {
            const deviceInfo: DeviceInfo = {
                type: 'midi',
                subtype: 'midi_input',
                name: deviceName,
                manufacturer: '',
            };
            this.onDeviceStatusChange.next({
                ...deviceInfo,
                status: isConnected ? 'connected' : 'disconnected',
            });
        };

        // Handle newly connected devices
        const newlyConnectedDevices = new Set([...newlyConnectedInputs, ...newlyConnectedOutputs]);
        newlyConnectedDevices.forEach(deviceName => {
            publishDeviceStatusChange(deviceName, true);
        });

        // Handle disconnected devices
        const disconnectedDevices = new Set([...newlyDisconnectedInputs, ...newlyDisconnectedOutputs]);
        disconnectedDevices.forEach(deviceName => {
            publishDeviceStatusChange(deviceName, false);
        });
    };
}
