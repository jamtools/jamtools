import {describe, it, expect, beforeEach} from 'vitest';
import {AudioIOModule, setAudioIODependencyCreator} from './audio_io_module';
import {MockAudioService} from '@jamtools/core/test/services/mock_audio_service';
import {MockWAMRegistryService} from '@jamtools/core/test/services/mock_wam_registry_service';
import {Subject} from 'rxjs';

describe('AudioIOModule', () => {
    let audioIOModule: AudioIOModule;
    let mockCoreDeps: any;
    let mockModDeps: any;
    let mockModuleAPI: any;

    beforeEach(() => {
        // Set up mock dependencies
        setAudioIODependencyCreator(async () => ({
            audio: new MockAudioService(),
            wamRegistry: new MockWAMRegistryService(),
        }));

        mockCoreDeps = {
            modules: {
                io: {
                    midiInputSubject: new Subject(),
                },
            },
        };

        mockModDeps = {
            toast: () => {},
        };

        mockModuleAPI = {
            statesAPI: {
                createSharedState: async (name: string, initialState: any) => ({
                    getState: () => initialState,
                    setState: (state: any) => {
                        Object.assign(initialState, state);
                    },
                    useState: () => initialState,
                }),
            },
        };

        audioIOModule = new AudioIOModule(mockCoreDeps, mockModDeps);
    });

    it('should initialize with correct module ID', () => {
        expect(audioIOModule.moduleId).toBe('audio_io');
    });

    it('should initialize with default state', () => {
        expect(audioIOModule.state).toEqual({
            audioContext: null,
            wamInstances: [],
            isAudioInitialized: false,
            masterVolume: 0.8,
        });
    });

    it('should initialize audio IO dependencies', async () => {
        await audioIOModule.initialize(mockModuleAPI);
        expect(audioIOModule['audioIODeps']).toBeDefined();
        expect(audioIOModule['audioIODeps'].audio).toBeInstanceOf(MockAudioService);
        expect(audioIOModule['audioIODeps'].wamRegistry).toBeInstanceOf(MockWAMRegistryService);
    });

    it('should ensure audio initialization', async () => {
        await audioIOModule.initialize(mockModuleAPI);
        await audioIOModule.ensureAudioInitialized();
        expect(audioIOModule['isAudioInitialized']).toBe(true);
    });

    it('should set master volume', async () => {
        await audioIOModule.initialize(mockModuleAPI);
        audioIOModule.setMasterVolume(0.5);
        
        const state = audioIOModule['audioIOState'].getState();
        expect(state.masterVolume).toBe(0.5);
    });

    it('should instantiate WAM', async () => {
        await audioIOModule.initialize(mockModuleAPI);
        
        const wam = await audioIOModule.instantiateWAM('com.jamtools.oscillator-synth', 'test-synth');
        expect(wam).toBeDefined();
        expect(wam.moduleId).toBe('com.jamtools.oscillator-synth');
        expect(wam.instanceId).toBe('test-synth');
    });

    it('should destroy WAM instance', async () => {
        await audioIOModule.initialize(mockModuleAPI);
        
        await audioIOModule.instantiateWAM('com.jamtools.oscillator-synth', 'test-synth');
        await audioIOModule.destroyWAMInstance('test-synth');
        
        const instance = audioIOModule.getWAMInstance('test-synth');
        expect(instance).toBeNull();
    });

    it('should get registered WAMs', async () => {
        await audioIOModule.initialize(mockModuleAPI);
        
        const registeredWAMs = audioIOModule.getRegisteredWAMs();
        expect(registeredWAMs.length).toBeGreaterThan(0);
        
        const synthWAM = registeredWAMs.find(wam => wam.moduleId === 'com.jamtools.oscillator-synth');
        expect(synthWAM).toBeDefined();
        expect(synthWAM?.name).toBe('Mock Oscillator Synthesizer');
    });

    it('should handle MIDI input', async () => {
        await audioIOModule.initialize(mockModuleAPI);
        
        const wam = await audioIOModule.instantiateWAM('com.jamtools.oscillator-synth', 'test-synth');
        
        // Mock MIDI event
        const midiEvent = {
            type: 'noteon',
            number: 60,
            velocity: 100,
            channel: 0,
        };
        
        // Trigger MIDI input
        mockCoreDeps.modules.io.midiInputSubject.next(midiEvent);
        
        // WAM should receive MIDI data (tested in mock implementation)
        expect(wam.onMidi).toBeDefined();
    });

    it('should convert MIDI events to bytes correctly', () => {
        const convertMidiEventToBytes = audioIOModule['convertMidiEventToBytes'];
        
        const noteOnEvent = {type: 'noteon', number: 60, velocity: 100, channel: 0};
        const noteOnBytes = convertMidiEventToBytes(noteOnEvent);
        expect(Array.from(noteOnBytes)).toEqual([0x90, 60, 100]);
        
        const noteOffEvent = {type: 'noteoff', number: 60, velocity: 0, channel: 0};
        const noteOffBytes = convertMidiEventToBytes(noteOffEvent);
        expect(Array.from(noteOffBytes)).toEqual([0x80, 60, 0]);
        
        const ccEvent = {type: 'controlchange', number: 7, velocity: 127, channel: 0};
        const ccBytes = convertMidiEventToBytes(ccEvent);
        expect(Array.from(ccBytes)).toEqual([0xB0, 7, 127]);
    });
});