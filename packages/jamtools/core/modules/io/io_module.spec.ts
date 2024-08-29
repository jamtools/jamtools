import {CoreDependencies} from '~/core/types/module_types';
import {JamToolsEngine} from '~/core/engine/engine';

describe('IoModule', () => {
    it('should initialize with the engine', async () => {
        const coreDeps: CoreDependencies = {
            log: jest.fn(),
            inputs: {
                midi: {

                } as any,
                qwerty: {

                } as any,
            },
            kvStore: {} as any,
            rpc: {} as any,
        };

        const engine = new JamToolsEngine(coreDeps);
        await engine.initialize();

        const ioModule = engine.moduleRegistry.getModule('io');

        expect(ioModule.state).toEqual({
            midiInputDevices: [],
            midiOutputDevices: [],
        });

        expect(coreDeps.log).toHaveBeenCalledWith('From io module: Original hello state: true');
        expect(coreDeps.log).toHaveBeenCalledWith('hello module initializing');
    });
});
