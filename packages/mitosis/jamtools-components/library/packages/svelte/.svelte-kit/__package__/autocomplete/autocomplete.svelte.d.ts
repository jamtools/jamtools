import { SvelteComponent } from "svelte";
export type Props = {
    getValues?: (input: string) => Promise<any[]>;
    renderChild?: any;
    transformData?: (item: any) => string;
};
declare const __propDef: {
    props: {
        getValues?: Props["getValues"];
        transformData?: Props["transformData"];
        renderChild?: Props["renderChild"];
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type AutocompleteProps = typeof __propDef.props;
export type AutocompleteEvents = typeof __propDef.events;
export type AutocompleteSlots = typeof __propDef.slots;
export default class Autocomplete extends SvelteComponent<AutocompleteProps, AutocompleteEvents, AutocompleteSlots> {
}
export {};
