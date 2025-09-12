import React from 'react';
import springboard from 'springboard';
import { ionianScaleDegreeQualities, ScaleDegreeInfo, cycle, getScaleDegreeFromScaleAndNote } from '@jamtools/core/modules/chord_families/root_mode_snack/root_mode_types';

type ChordInProgression = {
    scaleDegree: number;
    quality: 'major' | 'minor';
    duration: number; // in beats
    noteName: string;
    midiNotes: number[];
};

type RandomProgressionState = {
    currentKey: number; // MIDI note number (0-11)
    progression: ChordInProgression[];
    isPlaying: boolean;
    currentChordIndex: number;
};

declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        random_progression: RandomProgressionModuleReturnValue;
    }
}

type RandomProgressionModuleReturnValue = {
    generateRandomProgression(): ChordInProgression[];
    getCurrentKey(): number;
    setCurrentKey(key: number): void;
};

// Common chord progressions for inspiration
const COMMON_PROGRESSIONS = [
    [0, 5, 7, 4], // I-V-vi-IV (very common pop progression)
    [0, 7, 4, 5], // I-vi-IV-V (classic)
    [7, 4, 0, 5], // vi-IV-I-V (minor start)
    [0, 4, 5, 5], // I-IV-V-V (blues-ish)
    [0, 2, 4, 5], // I-ii-iii-V
    [0, 7, 2, 5], // I-vi-ii-V (jazz turnaround)
];

// Possible chord durations in beats
const CHORD_DURATIONS = [1, 2, 4, 8];

const generateRandomProgression = (key: number): ChordInProgression[] => {
    // Randomly pick a base progression or create a completely random one
    const useCommonProgression = Math.random() < 0.7; // 70% chance to use common progression
    
    let scaleDegrees: number[];
    if (useCommonProgression) {
        scaleDegrees = COMMON_PROGRESSIONS[Math.floor(Math.random() * COMMON_PROGRESSIONS.length)];
    } else {
        // Generate 3-6 random chords
        const length = 3 + Math.floor(Math.random() * 4);
        scaleDegrees = Array.from({ length }, () => {
            const availableDegrees = Object.keys(ionianScaleDegreeQualities)
                .map(Number)
                .filter(degree => ionianScaleDegreeQualities[degree]);
            return availableDegrees[Math.floor(Math.random() * availableDegrees.length)];
        });
    }

    return scaleDegrees.map(scaleDegree => {
        const quality = ionianScaleDegreeQualities[scaleDegree]!;
        const duration = CHORD_DURATIONS[Math.floor(Math.random() * CHORD_DURATIONS.length)];
        const rootNote = cycle(key + scaleDegree);
        const scaleDegreeInfo = getScaleDegreeFromScaleAndNote(key, rootNote);
        
        // Generate chord notes
        const midiNotes = getChordFromRootNote(rootNote, quality);
        
        return {
            scaleDegree,
            quality,
            duration,
            noteName: scaleDegreeInfo?.noteName || 'Unknown',
            midiNotes,
        };
    });
};

const getChordFromRootNote = (rootNote: number, quality: 'major' | 'minor'): number[] => {
    if (quality === 'major') {
        return [
            rootNote,
            rootNote + 4,
            rootNote + 7,
            rootNote + 12,
        ];
    } else {
        return [
            rootNote,
            rootNote + 3,
            rootNote + 7,
            rootNote + 12,
        ];
    }
};

springboard.registerModule('random_progression', {}, async (moduleAPI): Promise<RandomProgressionModuleReturnValue> => {
    // Start with C major (key = 0)
    const initialKey = 0;
    const initialProgression = generateRandomProgression(initialKey);

    const state = await moduleAPI.statesAPI.createSharedState<RandomProgressionState>('random_progression_state', {
        currentKey: initialKey,
        progression: initialProgression,
        isPlaying: false,
        currentChordIndex: -1,
    });

    const generateRandomProgression = (): ChordInProgression[] => {
        const currentState = state.getState();
        const newProgression = generateRandomProgression(currentState.currentKey);
        state.setState({
            ...currentState,
            progression: newProgression,
            isPlaying: false,
            currentChordIndex: -1,
        });
        return newProgression;
    };

    const getCurrentKey = (): number => {
        return state.getState().currentKey;
    };

    const setCurrentKey = (key: number): void => {
        const currentState = state.getState();
        const newProgression = generateRandomProgression(key);
        state.setState({
            ...currentState,
            currentKey: key,
            progression: newProgression,
            isPlaying: false,
            currentChordIndex: -1,
        });
    };

    // Get MIDI output macro for playback
    const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');
    const output = await macroModule.createMacro(moduleAPI, 'Random Progression MIDI Output', 'musical_keyboard_output', {});

    const playChord = (chord: ChordInProgression) => {
        // Play all notes in the chord
        chord.midiNotes.forEach(midiNote => {
            output.send({
                type: 'noteon',
                number: midiNote,
                velocity: 80,
                channel: 0,
            });
        });
    };

    const stopChord = (chord: ChordInProgression) => {
        // Stop all notes in the chord
        chord.midiNotes.forEach(midiNote => {
            output.send({
                type: 'noteoff',
                number: midiNote,
                velocity: 0,
                channel: 0,
            });
        });
    };

    const playProgression = async () => {
        const currentState = state.getState();
        if (currentState.isPlaying) return;

        state.setState({
            ...currentState,
            isPlaying: true,
            currentChordIndex: 0,
        });

        for (let i = 0; i < currentState.progression.length; i++) {
            const chord = currentState.progression[i];
            
            state.setState({
                ...state.getState(),
                currentChordIndex: i,
            });

            playChord(chord);
            
            // Wait for the chord duration (convert beats to milliseconds, assuming 120 BPM)
            const durationMs = (chord.duration / 120) * 60 * 1000;
            await new Promise(resolve => setTimeout(resolve, durationMs));
            
            stopChord(chord);
        }

        state.setState({
            ...state.getState(),
            isPlaying: false,
            currentChordIndex: -1,
        });
    };

    moduleAPI.registerRoute('', {}, () => {
        const currentState = state.useState();
        
        return <RandomProgressionComponent 
            state={currentState}
            onGenerateNew={generateRandomProgression}
            onKeyChange={setCurrentKey}
            onPlay={playProgression}
        />;
    });

    return {
        generateRandomProgression,
        getCurrentKey,
        setCurrentKey,
    };
});

type RandomProgressionComponentProps = {
    state: RandomProgressionState;
    onGenerateNew: () => void;
    onKeyChange: (key: number) => void;
    onPlay: () => void;
};

const RandomProgressionComponent: React.FC<RandomProgressionComponentProps> = ({ 
    state, 
    onGenerateNew, 
    onKeyChange,
    onPlay 
}) => {
    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>Random Chord Progression Generator</h2>
            
            <div style={{ marginBottom: '20px' }}>
                <label>
                    Key: 
                    <select 
                        value={state.currentKey} 
                        onChange={(e) => onKeyChange(parseInt(e.target.value))}
                        style={{ marginLeft: '10px', padding: '5px' }}
                    >
                        {keyNames.map((keyName, index) => (
                            <option key={index} value={index}>{keyName}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={onGenerateNew} 
                    style={{ 
                        padding: '10px 20px', 
                        marginRight: '10px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Generate New Progression
                </button>
                
                <button 
                    onClick={onPlay}
                    disabled={state.isPlaying}
                    style={{ 
                        padding: '10px 20px',
                        backgroundColor: state.isPlaying ? '#ccc' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: state.isPlaying ? 'not-allowed' : 'pointer'
                    }}
                >
                    {state.isPlaying ? 'Playing...' : 'Play Progression'}
                </button>
            </div>

            <div>
                <h3>Current Progression in {keyNames[state.currentKey]} Major:</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {state.progression.map((chord, index) => (
                        <div 
                            key={index}
                            style={{
                                border: '2px solid',
                                borderColor: index === state.currentChordIndex ? '#ff6b6b' : '#ddd',
                                borderRadius: '8px',
                                padding: '15px',
                                textAlign: 'center',
                                minWidth: '100px',
                                backgroundColor: index === state.currentChordIndex ? '#fff5f5' : '#f9f9f9'
                            }}
                        >
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                {chord.noteName}{chord.quality === 'minor' ? 'm' : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {chord.duration} beat{chord.duration !== 1 ? 's' : ''}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                <p>This feature generates random chord progressions contextual to the selected key.</p>
                <p>Click "Generate New Progression" to get a different progression, or "Play Progression" to hear it through MIDI.</p>
            </div>
        </div>
    );
};