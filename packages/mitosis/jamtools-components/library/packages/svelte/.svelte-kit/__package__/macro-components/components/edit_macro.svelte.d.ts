import { SvelteComponent } from "svelte";
type EditProps = {
    editing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    waiting: boolean;
    captured: MidiEventFull | null;
    confirmMacro: () => void;
    toggleWaiting: () => void;
    askDeleteSavedValue: (event: MidiEventFull) => void;
    saved: MidiEventFull[];
};
import { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
declare const __propDef: {
    props: {
        editing: EditProps["editing"];
        onEdit: EditProps["onEdit"];
        saved: EditProps["saved"];
        onCancelEdit: EditProps["onCancelEdit"];
        captured: EditProps["captured"];
        waiting: EditProps["waiting"];
        confirmMacro: EditProps["confirmMacro"];
        toggleWaiting: EditProps["toggleWaiting"];
        askDeleteSavedValue: EditProps["askDeleteSavedValue"];
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type EditMacroProps = typeof __propDef.props;
export type EditMacroEvents = typeof __propDef.events;
export type EditMacroSlots = typeof __propDef.slots;
export default class EditMacro extends SvelteComponent<EditMacroProps, EditMacroEvents, EditMacroSlots> {
}
export {};
