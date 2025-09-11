import {Subject} from 'rxjs';
import {AudioService} from '@jamtools/core/types/audio_io_types';

export class BrowserAudioService implements AudioService {
    audioContext: AudioContext | null = null;
    onAudioContextChange = new Subject<AudioContext | null>();
    
    private masterGainNode: GainNode | null = null;
    private isInitialized = false;

    initialize = async (): Promise<void> => {
        if (this.isInitialized) {
            return;
        }

        if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
            console.warn('Web Audio API not supported in this browser');
            return;
        }

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Create master gain node
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.connect(this.audioContext.destination);
            this.masterGainNode.gain.value = 0.8;

            // Handle audio context state changes
            this.handleAudioContextStateChange();

            this.onAudioContextChange.next(this.audioContext);
            this.isInitialized = true;

            console.log('Audio context initialized:', this.audioContext.state);
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            throw error;
        }
    };

    createAudioContext = (): AudioContext => {
        if (this.audioContext) {
            return this.audioContext;
        }

        if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
            throw new Error('Web Audio API not supported in this browser');
        }

        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.onAudioContextChange.next(this.audioContext);
        return this.audioContext;
    };

    getMasterGainNode = (): GainNode => {
        if (!this.masterGainNode) {
            throw new Error('Audio service not initialized. Call initialize() first.');
        }
        return this.masterGainNode;
    };

    setMasterVolume = (volume: number): void => {
        if (this.masterGainNode) {
            // Clamp volume between 0 and 1
            const clampedVolume = Math.max(0, Math.min(1, volume));
            this.masterGainNode.gain.value = clampedVolume;
        }
    };

    private handleAudioContextStateChange = () => {
        if (!this.audioContext) {
            return;
        }

        const handleStateChange = () => {
            console.log('Audio context state changed:', this.audioContext?.state);
            
            if (this.audioContext?.state === 'suspended') {
                // Try to resume on user interaction
                this.setupUserInteractionResuming();
            }
        };

        this.audioContext.addEventListener('statechange', handleStateChange);
    };

    private setupUserInteractionResuming = () => {
        if (!this.audioContext || this.audioContext.state !== 'suspended') {
            return;
        }

        const resumeAudio = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    console.log('Audio context resumed');
                    
                    // Remove event listeners after successful resume
                    document.removeEventListener('click', resumeAudio);
                    document.removeEventListener('touchstart', resumeAudio);
                    document.removeEventListener('keydown', resumeAudio);
                } catch (error) {
                    console.warn('Failed to resume audio context:', error);
                }
            }
        };

        // Add event listeners for user interaction
        document.addEventListener('click', resumeAudio, {once: true});
        document.addEventListener('touchstart', resumeAudio, {once: true});
        document.addEventListener('keydown', resumeAudio, {once: true});

        console.log('Audio context suspended. Waiting for user interaction to resume...');
    };
}