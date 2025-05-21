import { SvelteComponent } from "svelte";
type CaptureFormProps = {
    waiting: boolean;
    toggleWaiting: (options: object) => void;
    confirmMacro: (options: object) => void;
    captured: MidiEventFull | null;
};
import { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
declare const __propDef: {
    props: {
        waiting: CaptureFormProps["waiting"];
        captured: CaptureFormProps["captured"];
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
type CaptureFormProps_ = typeof __propDef.props;
export { CaptureFormProps_ as CaptureFormProps };
export type CaptureFormEvents = typeof __propDef.events;
export type CaptureFormSlots = typeof __propDef.slots;
export default class CaptureForm extends SvelteComponent<CaptureFormProps_, CaptureFormEvents, CaptureFormSlots> {
}
