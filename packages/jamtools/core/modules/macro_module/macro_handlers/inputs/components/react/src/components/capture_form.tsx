"use client";
import * as React from "react";

type CaptureFormProps = {
  waiting: boolean;
  toggleWaiting: (options: object) => void;
  confirmMacro: (options: object) => void;
  captured: MidiEventFull | null;
};
import type { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
const getKeyForMidiEvent = (event: MidiEventFull) => {
  return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
};

function CaptureForm(props: CaptureFormProps) {
  return (
    <div>
      <p>Waiting {new String(props.waiting).toString()}</p>
      {props.waiting ? (
        <>
          <button onClick={(event) => props.toggleWaiting({})}>Cancel</button>
          <button onClick={(event) => props.confirmMacro({})}>Confirm</button>
          <div>
            Captured:
            {props.captured ? (
              <pre data-testid="captured_event">
                {getKeyForMidiEvent(props.captured!)}
              </pre>
            ) : null}
          </div>
        </>
      ) : (
        <button onClick={(event) => props.toggleWaiting({})}>Capture</button>
      )}
    </div>
  );
}

export default CaptureForm;
