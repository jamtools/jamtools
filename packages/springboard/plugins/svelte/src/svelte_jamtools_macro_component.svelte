<script lang="ts">
    import type { MidiInputMacroPayload } from "@jamtools/core/modules/macro_module/macro_handlers/inputs/input_macro_handler_utils.tsx";
    import { stateSupervisorToStore } from "./svelte_helpers";
    import Edit from "@jamtools/core/modules/macro_module/macro_handlers/inputs/components/svelte/src/components/edit_macro.svelte";

    let { payload }: { payload: MidiInputMacroPayload } = $props();

    const states = payload.states;
    const actions = payload.actions;

    const editing = stateSupervisorToStore(states.editing);
    const waiting = stateSupervisorToStore(states.waiting);
    const captured = stateSupervisorToStore(states.captured);
    const savedMidiEvents = stateSupervisorToStore(states.savedMidiEvents);
</script>

<Edit
    editing={$editing}
    onEdit={actions.onEdit}
    onCancelEdit={actions.onCancelEdit}
    waiting={$waiting}
    captured={$captured}
    confirmMacro={actions.confirmMacro}
    toggleWaiting={actions.toggleWaiting}
    askDeleteSavedValue={actions.askDeleteSavedValue}
    saved={$savedMidiEvents}
/>

<!-- type EditProps = {
    editing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    waiting: boolean;
    captured: MidiEventFull | null;
    confirmMacro: () => void;
    toggleWaiting: () => void;
    askDeleteSavedValue: (event: MidiEventFull) => void;
    saved: MidiEventFull[];
  }; -->
