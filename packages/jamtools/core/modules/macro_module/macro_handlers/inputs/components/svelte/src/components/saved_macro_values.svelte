<script context="module" lang="ts">
  export type SavedMacroValues = {
    saved: MidiEventFull[];
    onClickDelete: (event: MidiEventFull) => void;
  };
</script>

<script lang="ts">
  import type { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
  const getKeyForMidiEvent = (event: MidiEventFull) => {
    return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
  };

  export let saved: SavedMacroValues["saved"];
  export let onClickDelete: SavedMacroValues["onClickDelete"];
</script>

<ul>
  {#each saved as midiEvent (getKeyForMidiEvent(midiEvent))}
    <li>
      {getKeyForMidiEvent(midiEvent)}<button
        on:click={(event) => {
          onClickDelete(midiEvent);
        }}
      >
        Delete
      </button>
    </li>
  {/each}
</ul>