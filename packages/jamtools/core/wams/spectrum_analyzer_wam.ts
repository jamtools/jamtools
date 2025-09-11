import {WebAudioModule, ParameterInfo, ParameterValues, WAMConfig} from '@jamtools/core/types/audio_io_types';

export class SpectrumAnalyzerWAM implements WebAudioModule {
    readonly moduleId: string;
    readonly instanceId: string;
    readonly name = 'Spectrum Analyzer';
    readonly vendor = 'Jamtools';
    
    readonly audioNode: GainNode;
    readonly audioContext: AudioContext;
    
    private analyzerNode: AnalyserNode;
    private inputGain: GainNode;
    private frequencyData: Uint8Array<ArrayBuffer>;
    private timeData: Uint8Array<ArrayBuffer>;
    
    private parameters = {
        'analyzer.fftSize': 2048,
        'analyzer.smoothing': 0.8,
        'analyzer.minDecibels': -100,
        'analyzer.maxDecibels': -30,
    };

    constructor(audioContext: AudioContext, config: WAMConfig) {
        this.audioContext = audioContext;
        this.moduleId = config.moduleId;
        this.instanceId = config.instanceId;
        
        // Create audio graph
        this.inputGain = audioContext.createGain();
        this.analyzerNode = audioContext.createAnalyser();
        this.audioNode = audioContext.createGain(); // Pass-through output
        
        // Connect: input -> inputGain -> analyzer -> output
        //                            \-> (analysis data)
        this.inputGain.connect(this.analyzerNode);
        this.analyzerNode.connect(this.audioNode);
        
        // Set initial analyzer properties
        this.updateAllParameters();
        
        // Initialize data arrays
        this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);
        this.timeData = new Uint8Array(this.analyzerNode.fftSize);
        
        // Apply initial parameters from config
        if (config.initialParameterValues) {
            this.setParameterValues(config.initialParameterValues);
        }
    }

    getParameterInfo = async (): Promise<ParameterInfo[]> => {
        return [
            {
                id: 'analyzer.fftSize',
                label: 'FFT Size',
                type: 'enum',
                defaultValue: 2048,
                enumValues: ['32', '64', '128', '256', '512', '1024', '2048', '4096', '8192', '16384', '32768'],
            },
            {
                id: 'analyzer.smoothing',
                label: 'Smoothing',
                type: 'float',
                defaultValue: 0.8,
                minValue: 0.0,
                maxValue: 1.0,
            },
            {
                id: 'analyzer.minDecibels',
                label: 'Min Decibels',
                type: 'float',
                defaultValue: -100,
                minValue: -150,
                maxValue: 0,
                units: 'dB',
            },
            {
                id: 'analyzer.maxDecibels',
                label: 'Max Decibels',
                type: 'float',
                defaultValue: -30,
                minValue: -100,
                maxValue: 0,
                units: 'dB',
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
        switch (id) {
            case 'analyzer.fftSize':
                // FFT size must be power of 2
                const validSizes = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
                const closestSize = validSizes.find(size => size >= value) || 2048;
                this.analyzerNode.fftSize = closestSize;
                
                // Recreate data arrays with new size
                this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);
                this.timeData = new Uint8Array(this.analyzerNode.fftSize);
                break;
                
            case 'analyzer.smoothing':
                this.analyzerNode.smoothingTimeConstant = value;
                break;
                
            case 'analyzer.minDecibels':
                this.analyzerNode.minDecibels = value;
                break;
                
            case 'analyzer.maxDecibels':
                this.analyzerNode.maxDecibels = value;
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

    // Analysis methods
    getFrequencyData = (): Uint8Array => {
        this.analyzerNode.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    };

    getTimeData = (): Uint8Array => {
        this.analyzerNode.getByteTimeDomainData(this.timeData);
        return this.timeData;
    };

    getFloatFrequencyData = (): Float32Array => {
        const floatData = new Float32Array(this.analyzerNode.frequencyBinCount);
        this.analyzerNode.getFloatFrequencyData(floatData);
        return floatData;
    };

    getFloatTimeData = (): Float32Array => {
        const floatData = new Float32Array(this.analyzerNode.fftSize);
        this.analyzerNode.getFloatTimeDomainData(floatData);
        return floatData;
    };

    // Utility methods for frequency analysis
    getFrequencyAtBin = (bin: number): number => {
        return (bin * this.audioContext.sampleRate) / (2 * this.analyzerNode.frequencyBinCount);
    };

    getBinAtFrequency = (frequency: number): number => {
        return Math.round((frequency * 2 * this.analyzerNode.frequencyBinCount) / this.audioContext.sampleRate);
    };

    // Get peaks in frequency spectrum
    getFrequencyPeaks = (threshold: number = 0.5): Array<{frequency: number; magnitude: number; bin: number}> => {
        const frequencyData = this.getFrequencyData();
        const peaks: Array<{frequency: number; magnitude: number; bin: number}> = [];
        
        for (let i = 1; i < frequencyData.length - 1; i++) {
            const current = frequencyData[i] / 255; // Normalize to 0-1
            const prev = frequencyData[i - 1] / 255;
            const next = frequencyData[i + 1] / 255;
            
            // Local maximum above threshold
            if (current > prev && current > next && current > threshold) {
                peaks.push({
                    frequency: this.getFrequencyAtBin(i),
                    magnitude: current,
                    bin: i,
                });
            }
        }
        
        return peaks.sort((a, b) => b.magnitude - a.magnitude); // Sort by magnitude desc
    };

    // Get input node for connecting sources
    getInputNode = (): AudioNode => {
        return this.inputGain;
    };

    createGui = async (): Promise<Element> => {
        const container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '200px';
        container.style.border = '1px solid #ccc';
        container.style.padding = '10px';
        container.style.backgroundColor = '#f0f0f0';
        
        const canvas = document.createElement('canvas');
        canvas.width = 380;
        canvas.height = 150;
        canvas.style.backgroundColor = '#000';
        
        const ctx = canvas.getContext('2d')!;
        
        // Simple spectrum display
        const draw = () => {
            const frequencyData = this.getFrequencyData();
            const barWidth = canvas.width / frequencyData.length;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#0f0';
            for (let i = 0; i < frequencyData.length; i++) {
                const barHeight = (frequencyData[i] / 255) * canvas.height;
                ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
            }
            
            requestAnimationFrame(draw);
        };
        
        draw();
        
        const title = document.createElement('h4');
        title.textContent = 'Spectrum Analyzer';
        title.style.margin = '0 0 10px 0';
        
        container.appendChild(title);
        container.appendChild(canvas);
        
        return container;
    };

    destroy = async (): Promise<void> => {
        // Disconnect all nodes
        this.inputGain.disconnect();
        this.analyzerNode.disconnect();
        this.audioNode.disconnect();
    };
}