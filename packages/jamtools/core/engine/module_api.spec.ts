import {JamToolsEngine} from '~/core/engine/engine';
import {makeMockCoreDependencies, makeMockExtraDependences} from '~/core/test/mock_core_dependencies';
import {jamtools} from '~/core/engine/register';

describe('ModuleAPI', () => {
    beforeEach(() => {
        jamtools.reset();
    });

    it('should create shared state', async () => {
        const coreDeps = makeMockCoreDependencies({store: {}});
        const extraDeps = makeMockExtraDependences();

        const engine = new JamToolsEngine(coreDeps, extraDeps);
        await engine.initialize();

        const mod = await engine.registerModule('Test_MusicalKeyboardInputMacro', {}, async (moduleAPI) => {
            const state = await moduleAPI.statesAPI.createSharedState('hey', {yep: 'yeah'});
            return {
                state,
            };
        });

        expect(mod.api.state.getState()).toEqual({yep: 'yeah'});
        await mod.api.state.setState({yep: 'nah'});
        expect(mod.api.state.getState()).toEqual({yep: 'nah'});
    });
});
