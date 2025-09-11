import React, {useState, useEffect} from 'react';
import springboard from 'springboard';
import {WebAudioModule} from '@jamtools/core/types/audio_io_types';

// Import the audio IO module
import './audio_io_module';

springboard.registerModule('AudioIOExample', {}, async (moduleAPI) => {
    const audioIOModule = moduleAPI.deps.module.moduleRegistry.getModule('audio_io');
    
    // Create shared state for WAM instances
    const wamInstancesState = await moduleAPI.statesAPI.createSharedState<WebAudioModule[]>('wamInstances', []);
    const masterVolumeState = await moduleAPI.statesAPI.createSharedState<number>('masterVolume', 0.8);

    // Subscribe to WAM instance changes
    audioIOModule.wamInstancesSubject.subscribe(instances => {
        wamInstancesState.setState(instances);
    });

    const ExampleComponent = () => {
        const wamInstances = wamInstancesState.useState();
        const masterVolume = masterVolumeState.useState();
        const [isAudioInitialized, setIsAudioInitialized] = useState(false);

        useEffect(() => {
            // Initialize audio on component mount
            audioIOModule.ensureAudioInitialized().then(() => {
                setIsAudioInitialized(true);
            });
        }, []);

        const createSynth = async () => {
            try {
                const synth = await audioIOModule.instantiateWAM('com.jamtools.oscillator-synth', `synth-${Date.now()}`);
                console.log('Created synthesizer:', synth.instanceId);
                
                // Connect to master output
                const masterGain = audioIOModule.getMasterGainNode();
                if (masterGain) {
                    synth.audioNode.connect(masterGain);
                }
            } catch (error) {
                console.error('Failed to create synthesizer:', error);
            }
        };

        const createDelay = async () => {
            try {
                const delay = await audioIOModule.instantiateWAM('com.jamtools.delay', `delay-${Date.now()}`);
                console.log('Created delay effect:', delay.instanceId);
                
                // Connect to master output
                const masterGain = audioIOModule.getMasterGainNode();
                if (masterGain) {
                    delay.audioNode.connect(masterGain);
                }
            } catch (error) {
                console.error('Failed to create delay:', error);
            }
        };

        const createAnalyzer = async () => {
            try {
                const analyzer = await audioIOModule.instantiateWAM('com.jamtools.spectrum-analyzer', `analyzer-${Date.now()}`);
                console.log('Created spectrum analyzer:', analyzer.instanceId);
                
                // Analyzer is typically inserted in the signal chain, not connected to output
                console.log('Analyzer created - connect it between other WAMs for visualization');
            } catch (error) {
                console.error('Failed to create analyzer:', error);
            }
        };

        const destroyWAM = async (instanceId: string) => {
            try {
                await audioIOModule.destroyWAMInstance(instanceId);
                console.log('Destroyed WAM:', instanceId);
            } catch (error) {
                console.error('Failed to destroy WAM:', error);
            }
        };

        const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const volume = parseFloat(event.target.value);
            audioIOModule.setMasterVolume(volume);
            masterVolumeState.setState(volume);
        };

        const playTestNote = async () => {
            // Find a synthesizer instance and play a test note
            const synth = wamInstances.find(wam => wam.moduleId === 'com.jamtools.oscillator-synth');
            if (synth && synth.onMidi) {
                // Play middle C (note 60)
                const noteOnData = new Uint8Array([0x90, 60, 100]); // Note on, middle C, velocity 100
                synth.onMidi(noteOnData);
                
                // Stop after 1 second
                setTimeout(() => {
                    const noteOffData = new Uint8Array([0x80, 60, 0]); // Note off
                    synth.onMidi(noteOffData);
                }, 1000);
            } else {
                alert('Create a synthesizer first!');
            }
        };

        return (
            <div style={{padding: '20px', fontFamily: 'Arial, sans-serif'}}>
                <h2>Audio IO Module Example</h2>
                
                <div style={{marginBottom: '20px'}}>
                    <p>Status: {isAudioInitialized ? '✅ Audio Initialized' : '⏳ Initializing...'}</p>
                    <p>Active WAM Instances: {wamInstances.length}</p>
                </div>

                <div style={{marginBottom: '20px'}}>
                    <label>
                        Master Volume: {Math.round(masterVolume * 100)}%
                        <br />
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={masterVolume}
                            onChange={handleVolumeChange}
                            style={{width: '200px'}}
                        />
                    </label>
                </div>

                <div style={{marginBottom: '20px'}}>
                    <h3>Create WAM Instances</h3>
                    <button onClick={createSynth} style={{marginRight: '10px'}}>
                        Create Synthesizer
                    </button>
                    <button onClick={createDelay} style={{marginRight: '10px'}}>
                        Create Delay Effect
                    </button>
                    <button onClick={createAnalyzer} style={{marginRight: '10px'}}>
                        Create Spectrum Analyzer
                    </button>
                </div>

                <div style={{marginBottom: '20px'}}>
                    <h3>Test Audio</h3>
                    <button onClick={playTestNote}>
                        Play Test Note (Middle C)
                    </button>
                </div>

                <div>
                    <h3>Active WAM Instances</h3>
                    {wamInstances.length === 0 ? (
                        <p>No WAM instances created yet.</p>
                    ) : (
                        <ul>
                            {wamInstances.map(wam => (
                                <li key={wam.instanceId} style={{marginBottom: '10px'}}>
                                    <strong>{wam.name}</strong> ({wam.instanceId})
                                    <br />
                                    Module: {wam.moduleId}
                                    <br />
                                    <button 
                                        onClick={() => destroyWAM(wam.instanceId)}
                                        style={{marginTop: '5px', color: 'red'}}
                                    >
                                        Destroy
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div style={{marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px'}}>
                    <h4>How to Use</h4>
                    <ol>
                        <li>Click "Create Synthesizer" to create an audio synthesizer</li>
                        <li>Click "Play Test Note" to hear a middle C note</li>
                        <li>Adjust the master volume slider</li>
                        <li>Create delay effects and spectrum analyzers to enhance the audio</li>
                        <li>The module automatically integrates with MIDI input devices</li>
                    </ol>
                </div>
            </div>
        );
    };

    moduleAPI.registerRoute('audio-io-example', {}, ExampleComponent);
});