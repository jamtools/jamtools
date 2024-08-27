import React, {createContext} from 'react';
import {Subject} from 'rxjs';

import Soundfont from 'soundfont-player';

import {CoreDependencies, JamTools, ModuleDependencies} from '~/types/module_types';
import {BaseModule, ModuleHookValue} from '../../base_module/base_module';
import {Module} from '~/module_registry/module_registry';
import {MacroModuleClient, MidiDeviceAndChannel, MidiDeviceAndChannelMap, MidiEventFull, ProducedType, RegisteredMacroConfigItems, convertMidiNumberToNoteAndOctave, stubProducedMacros} from '~/modules/macro_module/macro_module_types';
import {jamtools} from '~/engine/register';

type MidiThruState = {
    inputDevice?: MidiDeviceAndChannel;
    outputDevice?: MidiDeviceAndChannel;
};

type MidiThruHookValue = ModuleHookValue<MidiThruModule>;

const midiThruContext = createContext<MidiThruHookValue>({} as MidiThruHookValue);

jamtools.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new MidiThruModule(coreDeps, modDependencies);
});

declare module '~/module_registry/module_registry' {
    interface AllModules {
        basic_midi_thru: MidiThruModule;
    }
}

export class MidiThruModule implements Module<MidiThruState>, MacroModuleClient<MidiThruModule['macroConfig']> {
    moduleId = 'basic_midi_thru';
    enabled = false;

    soundfont!: Soundfont.Player;

    macroConfig = {
        myMidiInput: {
            type: 'musical_keyboard_input',
            onTrigger: this.onMidiInput.bind(this),
        },
        myMidiOutput: {
            type: 'musical_keyboard_output',
        },
    } as const satisfies RegisteredMacroConfigItems;

    initialize = async () => {
        this.coreDeps.log(`${this.moduleId} module initializing`);
        this.soundfont = await Soundfont.instrument(new AudioContext(), 'acoustic_grand_piano');
    };

    heldSoundfontNotes: {noteName: string; player: Soundfont.Player}[] = [];

    // we should think about jam tools as a package
    // it provides:
    // - engine
    //   - accepts custom modules
    //   - accepts object to disable any default modules
    //   - accepts optional route string to use as main module view, instead of root route
    // - React context provider
    // - browser route options, so the engine can declare its own routes and the webapp can use those

    // may need to be able to provide custom services too, like midi file recorder. so midi buddy can live in the pi, and also work in the browser
    // maestro takes care of who is recording
    // and you get all ui and rpc stuff for free
    // so then there's a JamToolsNodeEngine and JamToolsBrowserEngine
    // how are custom services injected then?
    // also, how are the required services injected in the package scenario? maybe export from `@jamtools/jamtools-node` and `@jamtools/jamtools-browser`
    // then there is just one JamToolsEngine, with a jamtoolsBrowser.getCoreDependencies() function to call before creating it

    // instead of coreDeps and moduleDeps being passed in, let's do one object with {core, module, custom}
    // then your custom module can do this
    // constructor(deps: JamToolsDependencies<MyCustomDependencies>)
    // maybe create custom macro providers too?
    // maybe we can use inferred types for the specific engine we create, and reference that engine in the `macroConfig` type of our module

    // need to abstract this soundfont stuff out of this class (into the musical_keyboard_output provider)
    // needs to be turn key to tell it to play and stop playing based on midi number
    // also should be able to change the instrument sound
    // also should be able to change octaves for qwerty keyboard (though that is unrelated)
    private onMidiInput(midiEvent: MidiEventFull) {
        // this.coreDeps.log(midiEvent);
        // this.macros.myMidiOutput.send(midiEvent.event);

        const noteAndOctave = convertMidiNumberToNoteAndOctave(midiEvent.event.number);

        if (midiEvent.event.type === 'noteon') {
            const playingNote = this.soundfont.start(noteAndOctave);
            this.heldSoundfontNotes.push({noteName: noteAndOctave, player: playingNote});
        } else if (midiEvent.event.type === 'noteoff') {
            const playingNoteIndex = this.heldSoundfontNotes.findIndex(p => p.noteName === noteAndOctave);
            if (playingNoteIndex !== -1) {
                const playingNote = this.heldSoundfontNotes[playingNoteIndex];
                playingNote.player.stop();
                this.heldSoundfontNotes = [
                    ...this.heldSoundfontNotes.slice(0, playingNoteIndex),
                    ...this.heldSoundfontNotes.slice(playingNoteIndex + 1),
                ];
            }
        }
    }

    /**
     *
     * Macro Module Boilerplate
     *
     **/

    macros = stubProducedMacros(this.macroConfig);
    updateMacroState(macros: typeof this.macros) {this.macros = macros;}

    // state: MidiThruState = {
    //     // hello: true,
    // };

    // internalState: MidiThruInternalState = {
    //     heldNotes: {
    //         inputs: {},
    //         outputs: {},
    //     },
    // };

    /**
     *
     * Boilerplate
     *
     **/

    routes: Record<string, React.ElementType> = {
        // '': MidiThruComponent,
        // 'actions': MidiThruComponent,
        // 'view': MidiThruComponent,
    };

    actions = {
        // hello: () => this.hello(),
    };


    private hello = () => {
        this.setState({
            // hello: !this.state.hello,
        });
    };

    subject: Subject<MidiThruState> = new Subject();

    Provider: React.ElementType = BaseModule.Provider(this, midiThruContext);
    static use = BaseModule.useModule(midiThruContext);
    private setState = BaseModule.setState(this);

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}
}
