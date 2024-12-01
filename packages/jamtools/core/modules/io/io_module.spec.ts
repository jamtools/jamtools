import '@jamtools/core/modules';

import {JamToolsEngine} from 'springboard/engine/engine';
import {makeMockCoreDependencies, makeMockExtraDependences} from 'springboard/test/mock_core_dependencies';

describe('IoModule', () => {
    it('should initialize with the engine', async () => {
        const coreDeps = makeMockCoreDependencies({store: {}});
        const extraDeps = makeMockExtraDependences();

        const engine = new JamToolsEngine(coreDeps, extraDeps);
        await engine.initialize();

        const ioModule = engine.moduleRegistry.getModule('io');

        expect(ioModule.state).toEqual({
            midiInputDevices: [],
            midiOutputDevices: [],
        });
    });
});
