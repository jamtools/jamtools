"use client";
import * as React from "react";

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
import type { MidiEventFull } from "@jamtools/core/modules/macro_module/macro_module_types";
import SavedMacroValues from "./saved_macro_values";
import CaptureForm from "./capture_form";

function Edit(props: EditProps) {
  return (
    <>
      {props.editing ? (
        <>
          <div>
            <button onClick={(event) => props.onCancelEdit()}>Cancel</button>
            <CaptureForm
              captured={props.captured}
              waiting={props.waiting}
              confirmMacro={() => props.confirmMacro()}
              toggleWaiting={() => props.toggleWaiting()}
            />
            <SavedMacroValues
              onClickDelete={(event) => props.askDeleteSavedValue(event)}
              saved={props.saved}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <button onClick={(event) => props.onEdit()}>Edit</button>
            {props.saved.length}
          </div>
        </>
      )}
    </>
  );
}

export default Edit;
