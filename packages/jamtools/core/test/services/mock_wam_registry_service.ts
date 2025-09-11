import {Subject} from 'rxjs';
import {WAMRegistryService, WAMDescriptor, WebAudioModule, WAMConfig} from '@jamtools/core/types/audio_io_types';

export class MockWAMRegistryService implements WAMRegistryService {
    onWAMRegistered = new Subject<WAMDescriptor>();
    onWAMInstantiated = new Subject<{descriptor: WAMDescriptor; instance: WebAudioModule}>();
    onWAMDestroyed = new Subject<{instanceId: string}>();
    
    private registeredWAMs: Map<string, WAMDescriptor> = new Map();
    private wamInstances: Map<string, WebAudioModule> = new Map();

    constructor() {
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

        const mockInstance: WebAudioModule = {
            moduleId,
            instanceId,
            name: descriptor.name,
            vendor: descriptor.vendor,
            audioNode: {} as AudioNode,
            audioContext: {} as AudioContext,
            
            getParameterInfo: async () => [],
            getParameterValues: async () => ({}),
            setParameterValues: async () => {},
            getState: async () => ({}),
            setState: async () => {},
            destroy: async () => {},
            
            onMidi: () => {},
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
            name: 'Mock Oscillator Synthesizer',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Mock synthesizer for testing',
            moduleUrl: '',
            isInstrument: true,
        });

        this.registerWAM({
            moduleId: 'com.jamtools.delay',
            name: 'Mock Delay Effect',
            vendor: 'Jamtools',
            version: '1.0.0',
            description: 'Mock delay effect for testing',
            moduleUrl: '',
            isEffect: true,
        });
    };
}