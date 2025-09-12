import {Subject} from 'rxjs';
import {WAMRegistryService, WAMDescriptor, WebAudioModule, WAMConfig, AudioService} from '@jamtools/core/types/audio_io_types';

export class BrowserWAMRegistryService implements WAMRegistryService {
    onWAMRegistered = new Subject<WAMDescriptor>();
    onWAMInstantiated = new Subject<{descriptor: WAMDescriptor; instance: WebAudioModule}>();
    onWAMDestroyed = new Subject<{instanceId: string}>();
    
    private registeredWAMs: Map<string, WAMDescriptor> = new Map();
    private wamInstances: Map<string, WebAudioModule> = new Map();

    constructor(private audioService: AudioService) {
        this.registerBuiltInWAMs();
    }

    registerWAM = (descriptor: WAMDescriptor): void => {
        this.registeredWAMs.set(descriptor.moduleId, descriptor);
        this.onWAMRegistered.next(descriptor);
    };

    getRegisteredWAMs = (): WAMDescriptor[] => {
        return Array.from(this.registeredWAMs.values());
    };

    instantiateWAM = async (moduleId: string, instanceId: string, config?: Partial<WAMConfig>): Promise<WebAudioModule> => {
        const descriptor = this.registeredWAMs.get(moduleId);
        if (!descriptor) {
            throw new Error(`WAM ${moduleId} not found. Available WAMs: ${Array.from(this.registeredWAMs.keys()).join(', ')}`);
        }

        if (this.wamInstances.has(instanceId)) {
            throw new Error(`WAM instance ${instanceId} already exists`);
        }

        const audioContext = this.audioService.audioContext;
        if (!audioContext) {
            throw new Error('Audio context not initialized. Call audioService.initialize() first.');
        }

        try {
            const fullConfig: WAMConfig = {
                moduleId,
                instanceId,
                initialParameterValues: {},
                ...config,
            };

            let wamInstance: WebAudioModule;

            // Handle built-in WAMs
            if (moduleId.startsWith('com.jamtools.')) {
                wamInstance = await this.createBuiltInWAM(moduleId, fullConfig, audioContext);
            } else {
                // Handle external WAMs
                const WAMClass = await import(descriptor.moduleUrl);
                wamInstance = await WAMClass.default.create(audioContext, fullConfig);
            }

            this.wamInstances.set(instanceId, wamInstance);
            this.onWAMInstantiated.next({descriptor, instance: wamInstance});

            return wamInstance;
        } catch (error) {
            console.error(`Failed to instantiate WAM ${moduleId}:`, error);
            throw error;
        }
    };

    destroyWAMInstance = async (instanceId: string): Promise<void> => {
        const instance = this.wamInstances.get(instanceId);
        if (!instance) {
            throw new Error(`WAM instance ${instanceId} not found`);
        }

        try {
            await instance.destroy();
            this.wamInstances.delete(instanceId);
            this.onWAMDestroyed.next({instanceId});
        } catch (error) {
            console.error(`Failed to destroy WAM instance ${instanceId}:`, error);
            throw error;
        }
    };

    getWAMInstance = (instanceId: string): WebAudioModule | null => {
        return this.wamInstances.get(instanceId) || null;
    };

    getAllInstances = (): WebAudioModule[] => {
        return Array.from(this.wamInstances.values());
    };

    private registerBuiltInWAMs = (): void => {
        // Register built-in synthesizer
        this.registerWAM({
            moduleId: 'com.jamtools.oscillator-synth',
            name: 'Oscillator Synthesizer',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Basic oscillator-based synthesizer with ADSR envelope',
            moduleUrl: '', // Built-in, no URL needed
            isInstrument: true,
            keywords: ['synthesizer', 'oscillator', 'instrument'],
        });

        // Register built-in delay effect
        this.registerWAM({
            moduleId: 'com.jamtools.delay',
            name: 'Delay Effect',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Digital delay effect with feedback and wet/dry mix',
            moduleUrl: '', // Built-in, no URL needed
            isEffect: true,
            keywords: ['delay', 'echo', 'effect'],
        });

        // Register built-in spectrum analyzer
        this.registerWAM({
            moduleId: 'com.jamtools.spectrum-analyzer',
            name: 'Spectrum Analyzer',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Real-time frequency spectrum analyzer',
            moduleUrl: '', // Built-in, no URL needed
            keywords: ['analyzer', 'spectrum', 'visualization'],
        });
    };

    private createBuiltInWAM = async (moduleId: string, config: WAMConfig, audioContext: AudioContext): Promise<WebAudioModule> => {
        switch (moduleId) {
            case 'com.jamtools.oscillator-synth':
                const {OscillatorSynthWAM} = await import('@jamtools/core/wams/oscillator_synth_wam');
                return new OscillatorSynthWAM(audioContext, config);
            
            case 'com.jamtools.delay':
                const {DelayWAM} = await import('@jamtools/core/wams/delay_wam');
                return new DelayWAM(audioContext, config);
            
            case 'com.jamtools.spectrum-analyzer':
                const {SpectrumAnalyzerWAM} = await import('@jamtools/core/wams/spectrum_analyzer_wam');
                return new SpectrumAnalyzerWAM(audioContext, config);
            
            default:
                throw new Error(`Unknown built-in WAM: ${moduleId}`);
        }
    };
}