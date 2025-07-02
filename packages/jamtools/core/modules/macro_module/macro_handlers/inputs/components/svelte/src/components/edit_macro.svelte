<script context="module" lang="ts">
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
</script>

<script lang="ts">
  import type { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
  import SavedMacroValues from "./saved_macro_values.svelte";
  import CaptureForm from "./capture_form.svelte";
  console.log(CaptureForm)
  console.log(SavedMacroValues)


  export let editing: EditProps["editing"];
  export let onEdit: EditProps["onEdit"];
  export let saved: EditProps["saved"];
  export let onCancelEdit: EditProps["onCancelEdit"];
  export let captured: EditProps["captured"];
  export let waiting: EditProps["waiting"];
  export let confirmMacro: EditProps["confirmMacro"];
  export let toggleWaiting: EditProps["toggleWaiting"];
  export let askDeleteSavedValue: EditProps["askDeleteSavedValue"];
</script>

{#if editing}
  <div>
    <button
      on:click={(event) => {
        onCancelEdit();
      }}
    >
      Cancel
    </button><CaptureForm
      {captured}
      {waiting}
      confirmMacro={() => confirmMacro()}
      toggleWaiting={() => toggleWaiting()}
    /><SavedMacroValues
      onClickDelete={(event) => askDeleteSavedValue(event)}
      {saved}
    />
  </div>
{:else}
  <div>
    <button
      on:click={(event) => {
        onEdit();
      }}
    >
      Edit
    </button>{saved.length}
  </div>
{/if}
