<script module lang="ts">
    import springboard from 'springboard';

    import { getSelf } from './import_self';
    import { createSvelteReactElement } from '../../src/svelte_mounting';

    import { ModuleAPI } from 'springboard/engine/module_api';

    import '@jamtools/core/modules/macro_module/macro_module';

    declare module 'springboard/module_registry/module_registry' {
        interface AllModules {
            Main: Awaited<ReturnType<typeof createResources>>;
        }
    }

    const createResources = async (moduleAPI: ModuleAPI) => {
        const states = await moduleAPI.createStates({
            count: 0,
            name: "",
        });

        const macros = await moduleAPI.getModule('macro').createMacros(moduleAPI, {
            slider1: {
                type: 'midi_control_change_input',
                config: {},
            },
            slider2: {
                type: 'midi_control_change_input',
                config: {},
            },
        });

        const actions = moduleAPI.createActions({
            increment: async (args: object): Promise<void> => {
                states.count.setState((value) => {
                    return value + 1;
                });
            },
            setName: async (args: { name: string }): Promise<void> => {
                states.name.setState(args.name);
            },
        });

        return {
            states,
            actions,
            macros,
        };
    };

    springboard.registerModule('Main', {}, async (app) => {
        app.registerRoute('/', {}, function () {
            const self = getSelf();
            return createSvelteReactElement(self, { app });
        });

        return createResources(app);
    });
</script>

<script lang="ts">
    import { stateSupervisorToStore } from './svelte_helpers';

    import Edit from '@springboardjs/plugin-svelte/src/svelte_jamtools_macro_component.svelte';

    let { app }: { app: ModuleAPI } = $props();

    const main = app.getModule('Main');

    const count = stateSupervisorToStore(main.states.count);
    const name = stateSupervisorToStore(main.states.name);

    const actions = main.actions;

    import _Form from './form.svelte';
    const Form = _Form;

    async function increment() {
        await actions.increment({});
    }

    const slider1 = main.macros.slider1;
    const slider2 = main.macros.slider2;
</script>

<h1>{$count}</h1>
<button onclick={increment}>Increment</button>

<Form submit={actions.setName} />

<p>{$name}</p>
