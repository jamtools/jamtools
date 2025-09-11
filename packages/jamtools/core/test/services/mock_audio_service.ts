import {Subject} from 'rxjs';
import {AudioService} from '@jamtools/core/types/audio_io_types';

export class MockAudioService implements AudioService {
    audioContext: AudioContext | null = null;
    onAudioContextChange = new Subject<AudioContext | null>();
    
    private mockGainNode: any = {
        gain: {value: 0.8},
        connect: () => {},
        disconnect: () => {},
    };

    initialize = async (): Promise<void> => {
        // Mock initialization - don't create real AudioContext in tests
        this.audioContext = null;
        this.onAudioContextChange.next(this.audioContext);
    };

    createAudioContext = (): AudioContext => {
        throw new Error('MockAudioService: Cannot create real AudioContext in test environment');
    };

    getMasterGainNode = (): GainNode => {
        return this.mockGainNode as GainNode;
    };

    setMasterVolume = (volume: number): void => {
        this.mockGainNode.gain.value = Math.max(0, Math.min(1, volume));
    };
}