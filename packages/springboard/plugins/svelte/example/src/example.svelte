<script module lang="ts">
    import springboard from 'springboard';

    import { getSelf } from './import_self';
    import { createSvelteReactElement } from '../../src/svelte_mounting';

    import { ModuleAPI } from 'springboard/engine/module_api';

    declare module 'springboard/module_registry/module_registry' {
        interface AllModules {
            Main: Awaited<ReturnType<typeof mod['cb']>>;
        }
    }

    const mod = springboard.registerModule('Main', {}, async function (app) {
        const states = await app.createStates({
            count: 0,
            name: "",
        });

        const actions = app.createActions({
            increment: async (args: object): Promise<void> => {
                states.count.setState((value) => {
                    return value + 1;
                });
            },
            setName: async (args: { name: string }): Promise<void> => {
                states.name.setState(args.name);
            },
        });

        app.registerRoute('/', {}, function () {
            const self = getSelf();
            return createSvelteReactElement(self, { app });
        });

        return {
            states,
            actions,
        };
    });
</script>

<script lang="ts">
    import { stateSupervisorToStore } from './svelte_helpers';

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
</script>

<h1>{$count}</h1>
<button onclick={increment}>Increment</button>

<Form submit={actions.setName} />

<p>{$name}</p>
