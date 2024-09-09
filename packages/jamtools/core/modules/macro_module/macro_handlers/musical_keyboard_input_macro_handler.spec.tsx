import {CoreDependencies} from '~/core/types/module_types';
import {JamToolsEngine} from '~/core/engine/engine';
import {makeMockCoreDependencies} from '~/core/test/mock_core_dependencies';
import {Subject} from 'rxjs';
import {QwertyCallbackPayload} from '~/core/types/io_types';
import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {jamtools} from '~/core/engine/register';

describe('MusicalKeyboardInputMacroHandler', () => {
    beforeEach(() => {
        jamtools.reset();
    });

    it('should create shared state', async () => {
        const coreDeps: CoreDependencies = makeMockCoreDependencies();

        const engine = new JamToolsEngine(coreDeps);
        await engine.initialize();

        const mod = await engine.registerModule('Test_MusicalKeyboardInputMacro', {}, async (moduleAPI) => {
            const state = await moduleAPI.states.createSharedState('hey', {yep: 'yeah'});
            return {
                state,
            };
        });

        expect(mod.api.state.getState()).toEqual({yep: 'yeah'});
        await mod.api.state.setState({yep: 'nah'});
        expect(mod.api.state.getState()).toEqual({yep: 'nah'});
    });

    it('should handle qwerty events', async () => {
        const coreDeps: CoreDependencies = makeMockCoreDependencies();

        const qwertySubject = new Subject<QwertyCallbackPayload>();
        coreDeps.inputs.qwerty = {
            onInputEvent: qwertySubject,
        };

        const engine = new JamToolsEngine(coreDeps);
        await engine.initialize();

        const calls: MidiEventFull[] = [];

        await engine.registerModule('Test_MusicalKeyboardInputMacro', {}, async (moduleAPI) => {
            const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');
            const midiInput = await macroModule.createMacro(moduleAPI, 'myinput', 'musical_keyboard_input', {enableQwerty: true});
            midiInput.onEventSubject.subscribe(event => {
                calls.push(event);
            });

            return {};
        });

        expect(calls).toHaveLength(0);

        qwertySubject.next({event: 'keydown', key: 'a'});
        await new Promise(r => setTimeout(r, 1000));
        expect(calls).toHaveLength(1);
    });

    it('should handle midi events', async () => {
        const coreDeps: CoreDependencies = makeMockCoreDependencies();

        const midiSubject = new Subject<MidiEventFull>();
        coreDeps.inputs.midi = {
            initialize: async () => {},
            onInputEvent: midiSubject,
        };

        const engine = new JamToolsEngine(coreDeps);
        await engine.initialize();

        const calls: MidiEventFull[] = [];

        await engine.registerModule('Test_MusicalKeyboardInputMacro', {}, async (moduleAPI) => {
            const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');
            const midiInput = await macroModule.createMacro(moduleAPI, 'myinput', 'musical_keyboard_input', {});
            midiInput.onEventSubject.subscribe(event => {
                calls.push(event);
            });

            return {};
        });

        expect(calls).toHaveLength(0);

        midiSubject.next({
            deviceInfo: {} as any,
            event: {} as any,
            type: 'midi',
        });

        // TODO: render UI in this test and edit state through that
        // expect(calls).toHaveLength(1);
    });
});
