import {Subject} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';
import {Module} from 'springboard/module_registry/module_registry';
import {AudioIOState, AudioService, WAMRegistryService, WebAudioModule} from '@jamtools/core/types/audio_io_types';
import springboard from 'springboard';
import {StateSupervisor} from 'springboard/services/states/shared_state_service';
import {ModuleAPI} from 'springboard/engine/module_api';
import {MidiEvent} from '@jamtools/core/modules/macro_module/macro_module_types';
import {MockAudioService} from '@jamtools/core/test/services/mock_audio_service';
import {MockWAMRegistryService} from '@jamtools/core/test/services/mock_wam_registry_service';

type AudioIODeps = {
    audio: AudioService;
    wamRegistry: WAMRegistryService;
}

let createAudioIODependencies = async (): Promise<AudioIODeps> => {
    return {
        audio: new MockAudioService(),
        wamRegistry: new MockWAMRegistryService(),
    };
};

// @platform "browser"
createAudioIODependencies = async () => {
    const {BrowserAudioService} = await import('@jamtools/core/services/browser/browser_audio_service');
    const {BrowserWAMRegistryService} = await import('@jamtools/core/services/browser/browser_wam_registry_service');

    const audio = new BrowserAudioService();
    const wamRegistry = new BrowserWAMRegistryService(audio);
    return {
        audio,
        wamRegistry,
    };
};
// @platform end

// @platform "node"
createAudioIODependencies = async () => {
    if (process.env.DISABLE_AUDIO === 'true') {
        return {
            audio: new MockAudioService(),
            wamRegistry: new MockWAMRegistryService(),
        };
    }

    const {NodeAudioService} = await import('@jamtools/core/services/node/node_audio_service');
    const {NodeWAMRegistryService} = await import('@jamtools/core/services/node/node_wam_registry_service');

    const audio = new NodeAudioService();
    const wamRegistry = new NodeWAMRegistryService(audio);
    return {
        audio,
        wamRegistry,
    };
};
// @platform end

export const setAudioIODependencyCreator = (func: typeof createAudioIODependencies) => {
    createAudioIODependencies = func;
};

springboard.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new AudioIOModule(coreDeps, modDependencies);
});

declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        audio_io: AudioIOModule;
    }
}

export class AudioIOModule implements Module<AudioIOState> {
    moduleId = 'audio_io';

    cleanup: (() => void)[] = [];

    state: AudioIOState = {
        audioContext: null,
        wamInstances: [],
        isAudioInitialized: false,
        masterVolume: 0.8,
    };

    audioContextSubject!: Subject<AudioContext | null>;
    wamInstancesSubject!: Subject<WebAudioModule[]>;

    audioIOState!: StateSupervisor<AudioIOState>;

    private audioIODeps!: AudioIODeps;
    private isAudioInitialized = false;

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {
    }

    ensureAudioInitialized = async () => {
        if (this.isAudioInitialized) {
            return;
        }

        this.isAudioInitialized = true;
        await this.audioIODeps.audio.initialize();

        const audioContext = this.audioIODeps.audio.audioContext;
        
        const state: AudioIOState = {
            audioContext,
            wamInstances: this.audioIODeps.wamRegistry.getAllInstances().map(instance => ({
                id: instance.instanceId,
                moduleId: instance.moduleId,
                name: instance.name,
            })),
            isAudioInitialized: true,
            masterVolume: this.state.masterVolume,
        };

        this.audioIOState.setState(state);
    };

    initialize = async (moduleAPI: ModuleAPI) => {
        this.audioIODeps = await createAudioIODependencies();

        this.audioContextSubject = this.audioIODeps.audio.onAudioContextChange;
        
        this.wamInstancesSubject = new Subject<WebAudioModule[]>();

        this.audioIOState = await moduleAPI.statesAPI.createSharedState('audio_io_state', this.state);

        // Subscribe to WAM registry changes
        this.audioIODeps.wamRegistry.onWAMInstantiated.subscribe(({instance}) => {
            const currentInstances = this.audioIODeps.wamRegistry.getAllInstances();
            this.wamInstancesSubject.next(currentInstances);
            
            // Update state
            const state = this.audioIOState.getState();
            state.wamInstances = currentInstances.map(inst => ({
                id: inst.instanceId,
                moduleId: inst.moduleId,
                name: inst.name,
            }));
            this.audioIOState.setState(state);
        });

        this.audioIODeps.wamRegistry.onWAMDestroyed.subscribe(({instanceId}) => {
            const currentInstances = this.audioIODeps.wamRegistry.getAllInstances();
            this.wamInstancesSubject.next(currentInstances);
            
            // Update state
            const state = this.audioIOState.getState();
            state.wamInstances = currentInstances.map(inst => ({
                id: inst.instanceId,
                moduleId: inst.moduleId,
                name: inst.name,
            }));
            this.audioIOState.setState(state);
        });

        // Connect to existing MIDI infrastructure if available
        this.setupMIDIIntegration();
    };

    private setupMIDIIntegration = () => {
        try {
            const ioModule = this.coreDeps.modules.io;
            if (ioModule && ioModule.midiInputSubject) {
                ioModule.midiInputSubject.subscribe((midiEvent: any) => {
                    this.handleMidiInput(midiEvent);
                });
            }
        } catch (error) {
            // IO module not available, skip MIDI integration
            console.warn('MIDI integration not available:', error);
        }
    };

    private handleMidiInput = (midiEvent: any) => {
        const midiData = this.convertMidiEventToBytes(midiEvent);
        
        // Send MIDI to all WAM instances that support it
        this.audioIODeps.wamRegistry.getAllInstances().forEach(wam => {
            if (wam.onMidi) {
                wam.onMidi(midiData);
            }
        });
    };

    private convertMidiEventToBytes = (midiEvent: any): Uint8Array => {
        // Convert jamtools MIDI event to standard MIDI bytes
        const {type, number, velocity = 64, channel = 0} = midiEvent;
        
        switch (type) {
            case 'noteon':
                return new Uint8Array([0x90 | channel, number, velocity]);
            case 'noteoff':
                return new Uint8Array([0x80 | channel, number, 0]);
            case 'controlchange':
                return new Uint8Array([0xB0 | channel, number, velocity]);
            default:
                return new Uint8Array([0x90, 60, 64]); // Default middle C
        }
    };

    public setMasterVolume = (volume: number) => {
        this.ensureAudioInitialized();
        this.audioIODeps.audio.setMasterVolume(volume);
        
        const state = this.audioIOState.getState();
        state.masterVolume = volume;
        this.audioIOState.setState(state);
    };

    public instantiateWAM = async (moduleId: string, instanceId: string) => {
        await this.ensureAudioInitialized();
        return this.audioIODeps.wamRegistry.instantiateWAM(moduleId, instanceId);
    };

    public destroyWAMInstance = async (instanceId: string) => {
        return this.audioIODeps.wamRegistry.destroyWAMInstance(instanceId);
    };

    public getWAMInstance = (instanceId: string) => {
        return this.audioIODeps.wamRegistry.getWAMInstance(instanceId);
    };

    public getAllWAMInstances = () => {
        return this.audioIODeps.wamRegistry.getAllInstances();
    };

    public getRegisteredWAMs = () => {
        return this.audioIODeps.wamRegistry.getRegisteredWAMs();
    };

    public getAudioContext = (): AudioContext | null => {
        return this.audioIODeps.audio.audioContext;
    };

    public getMasterGainNode = (): GainNode | null => {
        if (!this.audioIODeps.audio.audioContext) {
            return null;
        }
        return this.audioIODeps.audio.getMasterGainNode();
    };
}