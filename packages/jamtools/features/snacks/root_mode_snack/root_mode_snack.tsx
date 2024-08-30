import React from 'react';

import {Subject} from 'rxjs';

// import {startJamToolsAndRenderApp} from '@/react_entrypoint';
import {useSubject} from '~/core/module_registry/module_registry';
import {ScaleDegreeInfo, cycle, getScaleDegreeFromScaleAndNote} from './root_mode_types';

import {RootModeComponent} from './root_mode_component';
import {CoreDependencies, JamTools, ModuleDependencies} from '~/core/types/module_types';
import {jamtools} from '~/core/engine/register';

jamtools.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return rootModeModule(coreDeps, modDependencies);
});

setTimeout(async () => {
    // const engine = await startJamToolsAndRenderApp();

    // main();
});

type State = {
    chord: ScaleDegreeInfo | null;
    scale: number;
}

// snacks can alternatively use something like zustand to do their React state communication
// the framework should have first-class support for syncing state across React and all users
// the framework should provide a subject for you to send data to, and it gets sync'd across devices
const rootModeStateSubject: Subject<State> = new Subject();

// next to the home button, there should be a check box that says "use this browser tab as the maestro"
// it should be by default disabled (maybe?)
// use sessionStorage to store this user choice
// this makes it so all midi and soundfont type stuff is ignored
// basically disables the io module, or at least makes it so it doesn't dispatch anything

const rootModeModule = async (coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    let scale = 0; // C major on page load

    const setScale = (newScale: number) => {
        scale = newScale;
        rootModeStateSubject.next({
            chord: null,
            scale,
        });
    };

    return {
        moduleId: 'root_mode_snack',
        routes: {
            '': () => {
                const state = useSubject({chord: null, scale}, rootModeStateSubject);

                const onClick = () => {
                    setScale(cycle(state.scale + 1));
                };

                return (
                    <RootModeComponent
                        {...state}
                        onClick={onClick}
                    />
                );
            },
        },
        initialize: async () => {
            console.log('running snack: root mode');

            const macroModule = modDependencies.moduleRegistry.getModule('macro');

            const [input, output] = await Promise.all([
                macroModule.createMacro('MIDI Input', {type: 'musical_keyboard_input'}),
                macroModule.createMacro('MIDI Output', {type: 'musical_keyboard_output'}),
            ]);

            input.onEventSubject.subscribe(evt => {
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
                    const midiNumberToPlay = noteNumber + 24;
                    output.send({...evt.event, number: midiNumberToPlay});
                }

                if (evt.event.type === 'noteon') {
                    rootModeStateSubject.next({
                        chord: scaleDegreeInfo,
                        scale,
                    });
                } else if (evt.event.type === 'noteoff') {
                    // this naive logic is currently causing the second chord to disappear if the first one is released after pressing the second one
                    rootModeStateSubject.next({
                        chord: null,
                        scale,
                    });
                }
            });


        }
    };
};

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
