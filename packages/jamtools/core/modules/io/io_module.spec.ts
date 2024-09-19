import {CoreDependencies} from '~/core/types/module_types';
import {JamToolsEngine} from '~/core/engine/engine';
import {makeMockCoreDependencies} from '~/core/test/mock_core_dependencies';

describe('IoModule', () => {
    it('should initialize with the engine', async () => {
        const coreDeps: CoreDependencies = makeMockCoreDependencies({store: {}});

        const engine = new JamToolsEngine(coreDeps);
        await engine.initialize();

        const ioModule = engine.moduleRegistry.getModule('io');

        expect(ioModule.state).toEqual({
            midiInputDevices: [],
            midiOutputDevices: [],
        });
    });
});
