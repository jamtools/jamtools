import {Subject} from 'rxjs';
import {AudioService} from '@jamtools/core/types/audio_io_types';

export class NodeAudioService implements AudioService {
    audioContext: AudioContext | null = null;
    onAudioContextChange = new Subject<AudioContext | null>();
    
    private mockGainNode: any = {
        gain: {value: 0.8},
        connect: () => {},
        disconnect: () => {},
    };

    initialize = async (): Promise<void> => {
        // In Node.js environment, we can't create real AudioContext
        // This service provides a compatible interface for server-side rendering
        console.log('NodeAudioService: Audio functionality not available in Node.js environment');
        this.onAudioContextChange.next(this.audioContext);
    };

    createAudioContext = (): AudioContext => {
        throw new Error('NodeAudioService: AudioContext not available in Node.js environment');
    };

    getMasterGainNode = (): GainNode => {
        return this.mockGainNode as GainNode;
    };

    setMasterVolume = (volume: number): void => {
        this.mockGainNode.gain.value = Math.max(0, Math.min(1, volume));
        console.log(`NodeAudioService: Master volume set to ${volume} (mock)`);
    };
}