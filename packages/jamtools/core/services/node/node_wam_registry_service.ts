import {Subject} from 'rxjs';
import {WAMRegistryService, WAMDescriptor, WebAudioModule, WAMConfig, AudioService} from '@jamtools/core/types/audio_io_types';

export class NodeWAMRegistryService implements WAMRegistryService {
    onWAMRegistered = new Subject<WAMDescriptor>();
    onWAMInstantiated = new Subject<{descriptor: WAMDescriptor; instance: WebAudioModule}>();
    onWAMDestroyed = new Subject<{instanceId: string}>();
    
    private registeredWAMs: Map<string, WAMDescriptor> = new Map();
    private wamInstances: Map<string, WebAudioModule> = new Map();

    constructor(private audioService: AudioService) {
        this.registerMockWAMs();
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
            throw new Error(`WAM ${moduleId} not found`);
        }

        if (this.wamInstances.has(instanceId)) {
            throw new Error(`WAM instance ${instanceId} already exists`);
        }

        console.log(`NodeWAMRegistryService: Creating mock WAM instance ${instanceId} for ${moduleId}`);

        // Create mock WAM instance for Node.js environment
        const mockInstance: WebAudioModule = {
            moduleId,
            instanceId,
            name: descriptor.name,
            vendor: descriptor.vendor,
            audioNode: {} as AudioNode,
            audioContext: {} as AudioContext,
            
            getParameterInfo: async () => [],
            getParameterValues: async () => ({}),
            setParameterValues: async (values) => {
                console.log(`NodeWAMRegistryService: Mock parameter update for ${instanceId}:`, values);
            },
            getState: async () => ({}),
            setState: async (state) => {
                console.log(`NodeWAMRegistryService: Mock state update for ${instanceId}:`, state);
            },
            destroy: async () => {
                console.log(`NodeWAMRegistryService: Mock destroy for ${instanceId}`);
            },
            
            onMidi: (midiData) => {
                console.log(`NodeWAMRegistryService: Mock MIDI input for ${instanceId}:`, Array.from(midiData));
            },
        };

        this.wamInstances.set(instanceId, mockInstance);
        this.onWAMInstantiated.next({descriptor, instance: mockInstance});

        return mockInstance;
    };

    destroyWAMInstance = async (instanceId: string): Promise<void> => {
        const instance = this.wamInstances.get(instanceId);
        if (!instance) {
            throw new Error(`WAM instance ${instanceId} not found`);
        }

        await instance.destroy();
        this.wamInstances.delete(instanceId);
        this.onWAMDestroyed.next({instanceId});
    };

    getWAMInstance = (instanceId: string): WebAudioModule | null => {
        return this.wamInstances.get(instanceId) || null;
    };

    getAllInstances = (): WebAudioModule[] => {
        return Array.from(this.wamInstances.values());
    };

    private registerMockWAMs = (): void => {
        this.registerWAM({
            moduleId: 'com.jamtools.oscillator-synth',
            name: 'Oscillator Synthesizer (Node Mock)',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Mock synthesizer for Node.js environment',
            moduleUrl: '',
            isInstrument: true,
        });

        this.registerWAM({
            moduleId: 'com.jamtools.delay',
            name: 'Delay Effect (Node Mock)',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Mock delay effect for Node.js environment',
            moduleUrl: '',
            isEffect: true,
        });

        this.registerWAM({
            moduleId: 'com.jamtools.spectrum-analyzer',
            name: 'Spectrum Analyzer (Node Mock)',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Mock spectrum analyzer for Node.js environment',
            moduleUrl: '',
        });
    };
}