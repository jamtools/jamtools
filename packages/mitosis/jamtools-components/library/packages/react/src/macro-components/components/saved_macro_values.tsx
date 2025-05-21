"use client";
import * as React from "react";

export type SavedMacroValues = {
  saved: MidiEventFull[];
  onClickDelete: (event: MidiEventFull) => void;
};
import type { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
const getKeyForMidiEvent = (event: MidiEventFull) => {
  return `${event.deviceInfo.name}|${event.event.channel}|${event.event.number}`;
};

function SavedMacroValues(props: SavedMacroValues) {
  return (
    <ul>
      {props.saved?.map((event) => (
        <li key={getKeyForMidiEvent(event)}>
          {getKeyForMidiEvent(event)}
          <button onClick={(event) => props.onClickDelete(event)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

export default SavedMacroValues;
