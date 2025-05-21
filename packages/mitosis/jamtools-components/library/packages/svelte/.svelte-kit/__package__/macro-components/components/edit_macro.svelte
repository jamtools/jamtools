<script context="module"></script>

<script>import { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
import SavedMacroValues from "./saved_macro_values.svelte";
import CaptureForm from "./capture_form.svelte";
export let editing;
export let onEdit;
export let saved;
export let onCancelEdit;
export let captured;
export let waiting;
export let confirmMacro;
export let toggleWaiting;
export let askDeleteSavedValue;
</script>

{#if editing}
  <div>
    <button
      on:click={(event) => {
        onCancelEdit;
      }}
    >
      Cancel
    </button><CaptureForm
      {captured}
      {waiting}
      {confirmMacro}
      {toggleWaiting}
    /><SavedMacroValues
      onClickDelete={(event) => askDeleteSavedValue}
      {saved}
    />
  </div>
{:else}
  <div>
    <button
      on:click={(event) => {
        onEdit;
      }}
    >
      Edit
    </button>{saved.length}
  </div>
{/if}