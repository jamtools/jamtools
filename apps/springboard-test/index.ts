import {Springboard} from 'springboard/engine/engine';
import {springboard} from 'springboard/engine/register';

const mod = springboard.defineModule('Main', {
    externalDependencies: {
        mything: async () => {
            return {
                getTheThing: async () => 'thanks',
            };
        },
    },
}, async (m, deps) => {
    const myThing = await deps.externalDependencies.mything();

    // const macroModule = m.getModule('macro');
});

const engine = new Springboard({} as any, {});

engine.registerModule2(mod);
engine.registerModule2(mod, {
    externalDependencies: {
        mything: async () => {
            return {
                getTheThing: async () => {
                    return 'fegfeg';
                },
            }
        }
    }
});
