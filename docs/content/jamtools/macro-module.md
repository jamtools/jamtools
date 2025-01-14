The Macro module exposes functionality to allow the user to configure their own MIDI devices to use a given feature of your application. This means there are no hardcoded MIDI device names in your code, so your application can be used by any user. The Macro module uses the [MIDI IO module](./midi-io-module.md) to interact with MIDI devices.

Macros can be used as primitives to compose simple or complex features. They provide a way to interact with MIDI devices, while having the feature-level code be agnostic to the MIDI device being used.

The following macro types are exposed by the Macro module:

- Inputs:
    - `musical_keyboard_input` - Receive MIDI events for a MIDI keyboard chosen by the user. This is useful for receiving tonal input from a MIDI keyboard. The stored mapping consists of the midi controller, and a midi channel. Feature-level code generally doesn't need to know these details.
    - `midi_control_change_input` - Receive MIDI events for a specific [controller change](https://cmtext.indiana.edu/MIDI/chapter3_controller_change.php) input chosen by the user, like a slider or knob. This is useful for receiving a spectrum of data from one control.
    - `midi_button_input` - Receive MIDI events for a specific MIDI controller button or note chosen by the user. This is useful for running a specific action when the given button is pressed.
- Outputs
    - `musical_keyboard_output` - Send MIDI events to a MIDI keyboard chosen by the user. This is useful for sending tonal information to a DAW or hardware synth.
    - `midi_control_change_output` - Send MIDI events for a controller change output chosen by the user. This is useful for changing things on a DAW effect like the dry/wet or intensity setting.
    - `midi_button_output` - Send MIDI events for a specific button/note chosen by the user. This is useful to send discrete messages to a toggleable setting in a DAW. (note this is one is actually not implemented as of the time of writing this)

## Examples

Here is a basic "MIDI thru" example, where we simply proxy MIDI events between two MIDI keyboards chosen by the user:

```jsx
import springboard from 'springboard';

import '@jamtools/core/modules/macro_module/macro_module';

springboard.registerModule('MidiThru', {}, async (moduleAPI) => {
    // Get the Macro module
    const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');

    // Create macros
    const inputMacro = await macroModule.createMacro(moduleAPI, 'My MIDI Input', 'musical_keyboard_input', {});
    const outputMacro = await macroModule.createMacro(moduleAPI, 'My MIDI Output', 'musical_keyboard_output', {});

    // Subscribe to events from the MIDI keyboard(s) chosen by the user for the "My MIDI Input" macro defined above
    inputMacro.subject.subscribe(evt => {
        outputMacro.send(evt.event); // Send the same MIDI event to the configured MIDI output device
    });

    moduleAPI.registerRoute('', {}, () => {
        return (
            <div>
                <inputMacro.edit/>
                <outputMacro.edit/>
            </div>
        );
    });
});
```

We would normally do something more useful here like an arpeggio or chord extension, but for this example we are just doing a "MIDI Thru" by proxying the events from one MIDI device to another.

Instead of explicitly calling `input.subject.subscribe`, we can also use the shorthand `onTrigger` option to listen for events:

```jsx
const outputMacro = await macroModule.createMacro(moduleAPI, 'My MIDI Output', 'musical_keyboard_output', {});

const inputMacro = await macroModule.createMacro(moduleAPI, 'My MIDI Input', 'musical_keyboard_input', {
    onTrigger: (evt) => {
        outputMacro.send(evt.event);
    },
});
```

---

Here is an example where we extend the note pressed to be a major triad:

```jsx
const outputMacro = await macroModule.createMacro(moduleAPI, 'My MIDI Output', 'musical_keyboard_output', {});

const inputMacro = await macroModule.createMacro(moduleAPI, 'My MIDI Input', 'musical_keyboard_input', {
    onTrigger: (evt) => {
        // Send 3 MIDI events. One for each note of the triad.

        outputMacro.send(evt.event); // Send the original note pressed

        outputMacro.send({
            ...evt.event,
            number: evt.event.number + 4, // Major third interval
        });

        outputMacro.send({
            ...evt.event,
            number: evt.event.number + 7, // Perfect fifth interval
        });
    },
});
```
