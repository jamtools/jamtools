<script context="module"></script>

<script>import { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
import { getKeyForMidiEvent } from "../input_macro_handler_utils";
export let waiting;
export let captured;
</script>

<div>
  <p>
    Waiting {new String(waiting).toString()}
  </p>
  {#if waiting}
    <button
      on:click={(event) => {
        toggleWaiting({});
      }}
    >
      Cancel
    </button>
    <button
      on:click={(event) => {
        confirmMacro({});
      }}
    >
      Confirm
    </button>
    <div>
      Captured:

      {#if captured}
        <pre data-testid="captured_event">{getKeyForMidiEvent(captured)}</pre>
      {/if}
    </div>
  {:else}
    <button
      on:click={(event) => {
        toggleWaiting({});
      }}
    >
      Capture
    </button>
  {/if}
</div>