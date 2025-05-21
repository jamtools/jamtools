import { SvelteComponent } from "svelte";
export type SavedMacroValues = {
    saved: MidiEventFull[];
    onClickDelete: (event: MidiEventFull) => void;
};
import { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
declare const __propDef: any;
export type SavedMacroValuesProps = typeof __propDef.props;
export type SavedMacroValuesEvents = typeof __propDef.events;
export type SavedMacroValuesSlots = typeof __propDef.slots;
export default class SavedMacroValues extends SvelteComponent<SavedMacroValuesProps, SavedMacroValuesEvents, SavedMacroValuesSlots> {
}
export {};
