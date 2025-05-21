<script context="module"></script>

<script>import { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
import { getKeyForMidiEvent } from "../input_macro_handler_utils";
export let saved;
</script>

<ul>
  {#each saved as event (getKeyForMidiEvent(event))}
    <li>
      {getKeyForMidiEvent(event)}<button
        on:click={(event) => {
          onClickDelete(event);
        }}
      >
        Delete
      </button>
    </li>
  {/each}
</ul>