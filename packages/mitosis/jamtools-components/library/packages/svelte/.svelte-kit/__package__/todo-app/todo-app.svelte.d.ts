import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type TodoAppProps = typeof __propDef.props;
export type TodoAppEvents = typeof __propDef.events;
export type TodoAppSlots = typeof __propDef.slots;
export default class TodoApp extends SvelteComponent<TodoAppProps, TodoAppEvents, TodoAppSlots> {
}
export {};
