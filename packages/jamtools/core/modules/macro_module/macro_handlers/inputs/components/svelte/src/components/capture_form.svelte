<script context="module" lang="ts">
  type CaptureFormProps = {
    waiting: boolean;
    toggleWaiting: (options: object) => void;
    confirmMacro: (options: object) => void;
    captured: MidiEventFull | null;
  };
</script>

<script lang="ts">
  import type { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
  const getKeyForMidiEvent = (event: MidiEventFull) => {
    return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
  };

  export let waiting: CaptureFormProps["waiting"];
  export let toggleWaiting: CaptureFormProps["toggleWaiting"];
  export let confirmMacro: CaptureFormProps["confirmMacro"];
  export let captured: CaptureFormProps["captured"];
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