import {WebAudioModule, ParameterInfo, ParameterValues, WAMConfig} from '@jamtools/core/types/audio_io_types';

export class DelayWAM implements WebAudioModule {
    readonly moduleId: string;
    readonly instanceId: string;
    readonly name = 'Delay Effect';
    readonly vendor = 'Jamtools';
    
    readonly audioNode: GainNode;
    readonly audioContext: AudioContext;
    
    private inputGain: GainNode;
    private outputGain: GainNode;
    private wetGain: GainNode;
    private dryGain: GainNode;
    private delayNode: DelayNode;
    private feedbackGain: GainNode;
    
    private parameters = {
        'delay.time': 0.25,    // seconds
        'delay.feedback': 0.3, // 0-1
        'delay.wetLevel': 0.5, // 0-1
        'delay.dryLevel': 1.0, // 0-1
    };

    constructor(audioContext: AudioContext, config: WAMConfig) {
        this.audioContext = audioContext;
        this.moduleId = config.moduleId;
        this.instanceId = config.instanceId;
        
        // Create audio graph
        this.inputGain = audioContext.createGain();
        this.outputGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.delayNode = audioContext.createDelay(2.0); // Max 2 seconds delay
        this.feedbackGain = audioContext.createGain();
        
        // Main output node
        this.audioNode = this.outputGain;
        
        // Connect the delay network:
        // input -> inputGain -> [dry path] -> dryGain -> outputGain
        //                   \-> [wet path] -> delayNode -> wetGain -> outputGain
        //                                       ^
        //                                       |
        //                                   feedbackGain
        //                                       |
        //                                   [feedback loop]
        
        // Dry path
        this.inputGain.connect(this.dryGain);
        this.dryGain.connect(this.outputGain);
        
        // Wet path
        this.inputGain.connect(this.delayNode);
        this.delayNode.connect(this.wetGain);
        this.wetGain.connect(this.outputGain);
        
        // Feedback loop
        this.delayNode.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayNode);
        
        // Set initial parameter values
        this.updateAllParameters();
        
        // Apply initial parameters from config
        if (config.initialParameterValues) {
            this.setParameterValues(config.initialParameterValues);
        }
    }

    getParameterInfo = async (): Promise<ParameterInfo[]> => {
        return [
            {
                id: 'delay.time',
                label: 'Delay Time',
                type: 'float',
                defaultValue: 0.25,
                minValue: 0.001,
                maxValue: 2.0,
                units: 's',
            },
            {
                id: 'delay.feedback',
                label: 'Feedback',
                type: 'float',
                defaultValue: 0.3,
                minValue: 0.0,
                maxValue: 0.95, // Prevent runaway feedback
            },
            {
                id: 'delay.wetLevel',
                label: 'Wet Level',
                type: 'float',
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
            },
            {
                id: 'delay.dryLevel',
                label: 'Dry Level',
                type: 'float',
                defaultValue: 1.0,
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
            case 'delay.time':
                // Smooth delay time changes to avoid clicks
                this.delayNode.delayTime.setTargetAtTime(value, now, 0.01);
                break;
            case 'delay.feedback':
                this.feedbackGain.gain.setValueAtTime(value, now);
                break;
            case 'delay.wetLevel':
                this.wetGain.gain.setValueAtTime(value, now);
                break;
            case 'delay.dryLevel':
                this.dryGain.gain.setValueAtTime(value, now);
                break;
        }
    };

    private updateAllParameters = (): void => {
        for (const [id, value] of Object.entries(this.parameters)) {
            this.updateParameter(id, value);
        }
    };

    getState = async (): Promise<any> => {
        return {
            parameters: this.parameters,
        };
    };

    setState = async (state: any): Promise<void> => {
        if (state.parameters) {
            await this.setParameterValues(state.parameters);
        }
    };

    // Connect input to our input gain node
    connect = (destination: AudioNode): void => {
        this.inputGain.connect(destination);
    };

    // Get input node for connecting sources
    getInputNode = (): AudioNode => {
        return this.inputGain;
    };

    destroy = async (): Promise<void> => {
        // Disconnect all nodes
        this.inputGain.disconnect();
        this.outputGain.disconnect();
        this.wetGain.disconnect();
        this.dryGain.disconnect();
        this.delayNode.disconnect();
        this.feedbackGain.disconnect();
    };
}