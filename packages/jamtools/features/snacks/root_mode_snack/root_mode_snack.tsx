import React from 'react';

import {ScaleDegreeInfo, cycle, getScaleDegreeFromScaleAndNote} from './root_mode_types';

import {RootModeComponent} from './root_mode_component';
import {jamtools} from 'springboard/engine/register';

type State = {
    chord: ScaleDegreeInfo | null;
    scale: number;
}

jamtools.registerModule('root_mode_module', {}, async (moduleAPI) => {
    // C major on page load
    let scale = 0;

    const rootModeState = await moduleAPI.statesAPI.createSharedState<State>('state', {chord: null, scale});

    const setScale = (newScale: number) => {
        scale = newScale;
        rootModeState.setState({
            chord: null,
            scale,
        });
    };

    moduleAPI.registerRoute('', {}, () => {
        const state = rootModeState.useState();

        const onClick = () => {
            setScale(cycle(state.scale + 1));
        };

        return (
            <RootModeComponent
                {...state}
                onClick={onClick}
            />
        );
    });

    const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');

    const [input, output] = await Promise.all([
        macroModule.createMacro(moduleAPI, 'MIDI Input', 'musical_keyboard_input', {}),
        macroModule.createMacro(moduleAPI, 'MIDI Output', 'musical_keyboard_output', {}),
    ]);

    input.subject.subscribe(evt => {
        const midiNumber = evt.event.number;
        const scaleDegreeInfo = getScaleDegreeFromScaleAndNote(scale, midiNumber);
        if (!scaleDegreeInfo) {
            return;
        }

        const chordNotes = getChordFromRootNote(scale, midiNumber);
        if (!chordNotes.length) {
            return;
        }

        for (const noteNumber of chordNotes) {
            const midiNumberToPlay = noteNumber;
            output.send({...evt.event, number: midiNumberToPlay});
        }

        if (evt.event.type === 'noteon') {
            rootModeState.setState({
                chord: scaleDegreeInfo,
                scale,
            });
        } else if (evt.event.type === 'noteoff') {
            // this naive logic is currently causing the second chord to disappear if the first one is released after pressing the second one
            rootModeState.setState({
                chord: null,
                scale,
            });
        }
    }); // .cleanup()
});

const getChordFromRootNote = (scale: number, rootNote: number): number[] => {
    const scaleDegreeInfo = getScaleDegreeFromScaleAndNote(scale, rootNote);

    if (!scaleDegreeInfo) {
        return [];
    }

    if (scaleDegreeInfo.quality === 'major') {
        return [
            rootNote,
            rootNote + 4,
            rootNote + 7,
            rootNote + 12,
        ];
    }

    if (scaleDegreeInfo.quality === 'minor') {
        return [
            rootNote,
            rootNote + 3,
            rootNote + 7,
            rootNote + 12,
        ];
    }

    return [];
};
