import {act} from 'react';

import { screen } from 'shadow-dom-testing-library';
import '@testing-library/jest-dom';

import '~/core/modules';
import {JamToolsEngine} from '~/core/engine/engine';

import {makeMockCoreDependencies, makeMockExtraDependences} from '~/core/test/mock_core_dependencies';
import {Subject} from 'rxjs';
import {QwertyCallbackPayload} from '~/core/types/io_types';
import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {jamtools} from '~/core/engine/register';
import {getMacroInputTestHelpers} from './macro_input_test_helpers';

describe('MusicalKeyboardInputMacroHandler', () => {
    beforeEach(() => {
        jamtools.reset();
    });

    it('should handle qwerty events', async () => {
        const coreDeps = makeMockCoreDependencies({store: {}});
        const extraDeps = makeMockExtraDependences();

        const qwertySubject = new Subject<QwertyCallbackPayload>();
        coreDeps.inputs.qwerty.onInputEvent = qwertySubject;

        const engine = new JamToolsEngine(coreDeps, extraDeps);
        await engine.initialize();

        const calls: MidiEventFull[] = [];

        await engine.registerModule('Test_MusicalKeyboardInputMacro', {}, async (moduleAPI) => {
            const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');
            const midiInput = await macroModule.createMacro(moduleAPI, 'myinput', 'musical_keyboard_input', {enableQwerty: true});
            midiInput.subject.subscribe(event => {
                calls.push(event);
            });

            return {};
        });

        expect(calls).toHaveLength(0);

        qwertySubject.next({event: 'keydown', key: 'a'});
        // await new Promise(r => setTimeout(r, 1000));
        // expect(calls).toHaveLength(0);
        expect(calls).toHaveLength(1);
    });

    it('should handle midi events', async () => {
        const helpers = getMacroInputTestHelpers();
        const midiSubject = new Subject<MidiEventFull>();

        const engine = await helpers.setupTest(midiSubject);
        const moduleId = 'Test_MusicalKeyboardInputMacro';

        const calls: MidiEventFull[] = [];

        await act(async () => {
            await engine.registerModule(moduleId, {}, async (moduleAPI) => {
                const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');
                const midiInput = await macroModule.createMacro(moduleAPI, 'myinput', 'musical_keyboard_input', {});
                midiInput.subject.subscribe(event => {
                    calls.push(event);
                });

                return {};
            });
        });

        await helpers.gotoMacroPage();

        // # Start capture
        await helpers.clickCapture(moduleId);

        // # Purposely send irrelevant cc midi event
        await helpers.sendMidiMessage(midiSubject, 'some_midi_input', {
            type: 'cc',
            number: 12,
            channel: 1,
        });

        // * Assert no relevant event as been captured
        let captureOutput = screen.queryByTestId('captured_event');
        expect(captureOutput).not.toBeInTheDocument();

        // # Purposely send relevant noteon midi event
        await helpers.sendMidiMessage(midiSubject, 'some_midi_input', {
            type: 'noteon',
            number: 12,
            channel: 1,
        });

        // * Assert event has been captured
        captureOutput = screen.queryByTestId('captured_event');
        expect(captureOutput).toBeInTheDocument();
        expect(captureOutput?.textContent).toEqual('some_midi_input|1|12');

        // # Confirm the captured event
        await helpers.confirmCapture(moduleId);

        // # Send noteon event from wrong midi input
        await helpers.sendMidiMessage(midiSubject, 'some_other_midi_input', {
            type: 'noteon',
            number: 12,
            channel: 1,
        });
        expect(calls).toHaveLength(0);

        // # Send noteon event from wrong midi channel
        await helpers.sendMidiMessage(midiSubject, 'some_midi_input', {
            type: 'noteon',
            number: 12,
            channel: 2,
        });
        expect(calls).toHaveLength(0);

        // # Send irrelevant cc midi event
        await helpers.sendMidiMessage(midiSubject, 'some_midi_input', {
            type: 'cc',
            number: 12,
            channel: 1,
        });
        expect(calls).toHaveLength(0);

        // # Send correct noteon events
        await helpers.sendMidiMessage(midiSubject, 'some_midi_input', {
            type: 'noteon',
            number: 12,
            channel: 1,
        });
        await helpers.sendMidiMessage(midiSubject, 'some_midi_input', {
            type: 'noteon',
            number: 13,
            channel: 1,
        });
        expect(calls).toHaveLength(2);
    });
});
