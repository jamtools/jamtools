import {WebAudioModule, ParameterInfo, ParameterValues, WAMConfig} from '@jamtools/core/types/audio_io_types';

export class OscillatorSynthWAM implements WebAudioModule {
    readonly moduleId: string;
    readonly instanceId: string;
    readonly name = 'Oscillator Synthesizer';
    readonly vendor = 'Jamtools';
    
    readonly audioNode: GainNode;
    readonly audioContext: AudioContext;
    
    private oscillators: Map<number, {osc: OscillatorNode; gain: GainNode}> = new Map();
    private parameters = {
        'osc.waveform': 0, // 0=sine, 1=square, 2=sawtooth, 3=triangle
        'env.attack': 0.1,
        'env.decay': 0.1,
        'env.sustain': 0.8,
        'env.release': 0.5,
        'filter.cutoff': 1000,
        'filter.resonance': 1,
        'master.gain': 0.5,
    };
    
    private filterNode: BiquadFilterNode;

    constructor(audioContext: AudioContext, config: WAMConfig) {
        this.audioContext = audioContext;
        this.moduleId = config.moduleId;
        this.instanceId = config.instanceId;
        
        // Create audio graph
        this.audioNode = audioContext.createGain();
        this.filterNode = audioContext.createBiquadFilter();
        
        this.filterNode.connect(this.audioNode);
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = this.parameters['filter.cutoff'];
        this.filterNode.Q.value = this.parameters['filter.resonance'];
        
        this.audioNode.gain.value = this.parameters['master.gain'];
        
        // Apply initial parameters
        if (config.initialParameterValues) {
            this.setParameterValues(config.initialParameterValues);
        }
    }

    getParameterInfo = async (): Promise<ParameterInfo[]> => {
        return [
            {
                id: 'osc.waveform',
                label: 'Waveform',
                type: 'enum',
                defaultValue: 0,
                enumValues: ['Sine', 'Square', 'Sawtooth', 'Triangle'],
            },
            {
                id: 'env.attack',
                label: 'Attack',
                type: 'float',
                defaultValue: 0.1,
                minValue: 0.001,
                maxValue: 2.0,
                units: 's',
            },
            {
                id: 'env.decay',
                label: 'Decay',
                type: 'float',
                defaultValue: 0.1,
                minValue: 0.001,
                maxValue: 2.0,
                units: 's',
            },
            {
                id: 'env.sustain',
                label: 'Sustain',
                type: 'float',
                defaultValue: 0.8,
                minValue: 0.0,
                maxValue: 1.0,
            },
            {
                id: 'env.release',
                label: 'Release',
                type: 'float',
                defaultValue: 0.5,
                minValue: 0.001,
                maxValue: 5.0,
                units: 's',
            },
            {
                id: 'filter.cutoff',
                label: 'Filter Cutoff',
                type: 'float',
                defaultValue: 1000,
                minValue: 20,
                maxValue: 20000,
                units: 'Hz',
            },
            {
                id: 'filter.resonance',
                label: 'Filter Resonance',
                type: 'float',
                defaultValue: 1,
                minValue: 0.1,
                maxValue: 30,
            },
            {
                id: 'master.gain',
                label: 'Master Gain',
                type: 'float',
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
            },
        ];
    };

    getParameterValues = async (): Promise<ParameterValues> => {
        return {...this.parameters};
    };

    setParameterValues = async (values: ParameterValues): Promise<void> => {
        for (const [id, value] of Object.entries(values)) {
            if (id in this.parameters) {
                this.parameters[id as keyof typeof this.parameters] = value;
                this.updateParameter(id, value);
            }
        }
    };

    private updateParameter = (id: string, value: number): void => {
        const now = this.audioContext.currentTime;
        
        switch (id) {
            case 'filter.cutoff':
                this.filterNode.frequency.setValueAtTime(value, now);
                break;
            case 'filter.resonance':
                this.filterNode.Q.setValueAtTime(value, now);
                break;
            case 'master.gain':
                this.audioNode.gain.setValueAtTime(value, now);
                break;
        }
    };

    getState = async (): Promise<any> => {
        return {
            parameters: this.parameters,
            activeNotes: Array.from(this.oscillators.keys()),
        };
    };

    setState = async (state: any): Promise<void> => {
        if (state.parameters) {
            await this.setParameterValues(state.parameters);
        }
    };

    onMidi = (midiData: Uint8Array): void => {
        const [status, note, velocity] = midiData;
        const command = status & 0xF0;
        
        switch (command) {
            case 0x90: // Note on
                if (velocity > 0) {
                    this.noteOn(note, velocity / 127);
                } else {
                    this.noteOff(note);
                }
                break;
            case 0x80: // Note off
                this.noteOff(note);
                break;
        }
    };

    private noteOn = (note: number, velocity: number): void => {
        // Stop existing note if playing
        this.noteOff(note);
        
        const frequency = this.midiNoteToFrequency(note);
        const waveforms: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
        const waveform = waveforms[Math.floor(this.parameters['osc.waveform'])] || 'sine';
        
        // Create oscillator and gain
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = waveform;
        osc.frequency.value = frequency;
        
        // Connect: osc -> gain -> filter -> output
        osc.connect(gain);
        gain.connect(this.filterNode);
        
        // ADSR envelope
        const now = this.audioContext.currentTime;
        const attack = this.parameters['env.attack'];
        const decay = this.parameters['env.decay'];
        const sustain = this.parameters['env.sustain'];
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity, now + attack);
        gain.gain.linearRampToValueAtTime(velocity * sustain, now + attack + decay);
        
        osc.start(now);
        
        this.oscillators.set(note, {osc, gain});
    };

    private noteOff = (note: number): void => {
        const oscillatorData = this.oscillators.get(note);
        if (!oscillatorData) {
            return;
        }
        
        const {osc, gain} = oscillatorData;
        const now = this.audioContext.currentTime;
        const release = this.parameters['env.release'];
        
        // Release envelope
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + release);
        
        osc.stop(now + release);
        this.oscillators.delete(note);
    };

    private midiNoteToFrequency = (note: number): number => {
        return 440 * Math.pow(2, (note - 69) / 12);
    };

    destroy = async (): Promise<void> => {
        // Stop all oscillators
        for (const [note] of this.oscillators) {
            this.noteOff(note);
        }
        
        // Disconnect audio nodes
        this.filterNode.disconnect();
        this.audioNode.disconnect();
    };
}