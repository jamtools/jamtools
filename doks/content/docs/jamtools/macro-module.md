---
title: "MIDI Macros"
description: "Reference pages are ideal for outlining how things work in terse and clear terms."
summary: ""
date: 2023-09-07T16:13:18+02:00
lastmod: 2023-09-07T16:13:18+02:00
draft: false
weight: 100
toc: true
seo:
  title: "" # custom title (optional)
  description: "" # custom description (recommended)
  canonical: "" # custom canonical URL (optional)
  robots: "" # custom robot tags (optional)
---

The Macro module exposes functionality to allow the user to configure their own MIDI devices to use a given feature of your application. This means there are no hardcoded MIDI device names in your code, so your application can be used by any user. A macro can capture unlimited mapped inputs from different instruments, so it remembers every mapping that you've had mapped to that feature, and they can be individually added/deleted by the user.

Macros can be used as primitives to compose simple or complex features. They provide a way to interact with MIDI devices, while having the feature-level code be agnostic to the MIDI device being used.

The following macro types are exposed by the Macro module:

- Inputs:
    - `musical_keyboard_input` - Receive MIDI events for a MIDI keyboard chosen by the user. This is useful for receiving tonal input from a MIDI keyboard. The stored mapping consists of the midi controller, and a midi channel. Feature-level code generally doesn't need to know these details.
    - `midi_control_change_input` - Receive MIDI events for a specific [controller change](https://cmtext.indiana.edu/MIDI/chapter3_controller_change.php) input chosen by the user, like a slider or knob. This is useful for receiving a spectrum of data from one control.
    - `midi_button_input` - Receive MIDI events for a specific MIDI controller button or note chosen by the user. This is useful for running a specific action when the given button is pressed.
- Outputs
    - `musical_keyboard_output` - Send MIDI events to a MIDI keyboard chosen by the user. This is useful for sending tonal information to a DAW or hardware synth.
    - `midi_control_change_output` - Send MIDI events for a controller change output chosen by the user. This is useful for changing things on a DAW effect like the dry/wet or intensity setting.
    - `midi_button_output` - Send MIDI events for a specific button/note chosen by the user. This is useful to send discrete messages to a toggleable setting in a DAW.

## Examples

Here is a basic "MIDI thru" example, where we simply proxy MIDI events between two MIDI keyboards chosen by the user:

```jsx
import React from 'react';
import springboard from 'springboard';

import '@jamtools/core/modules/macro_module/macro_module';

springboard.registerModule('midi_thru', {}, async (moduleAPI) => {
    const macroModule = moduleAPI.getModule('macro');

    const {myInput, myOutput} = await macroModule.createMacros(moduleAPI, {
        myInput: {type: 'musical_keyboard_input'},
        myOutput: {type: 'musical_keyboard_output'},
    });

    myInput.subject.subscribe(evt => {
        myOutput.send(evt.event);
    });

    moduleAPI.registerRoute('', () => {
        return (
            <div>
                <myInput.components.edit/>
                <myOutput.components.edit/>
            </div>
        );
    });
});
```

We would normally do something more useful here like an arpeggio or chord extension, but for this example we are just doing a "MIDI Thru" by proxying the events from one MIDI device to another.

Instead of explicitly calling `input.subject.subscribe`, we can also use the shorthand `onTrigger` option to listen for events:

```jsx
const macros = await macroModule.createMacros(moduleAPI, {
    myInput: {
        type: 'musical_keyboard_input',
        config: {
            onTrigger: (evt) => {
                macros.myOutput.send(evt.event);
            },
        },
    },
    myOutput: {type: 'musical_keyboard_output'},
});
```

---

Here is an example where we extend the note pressed to be a major triad:

```jsx
const macros = await macroModule.createMacros(moduleAPI, {
    myInput: {
        type: 'musical_keyboard_input',
        config: {
            onTrigger: (evt) => {
                macros.myOutput.send(evt.event); // Send the original note pressed

                macros.myOutput.send({
                    ...evt.event,
                    number: evt.event.number + 4, // Major third interval
                });

                macros.myOutput.send({
                    ...evt.event,
                    number: evt.event.number + 7, // Perfect fifth interval
                });
            },
        },
    },
    myOutput: {type: 'musical_keyboard_output'},
});
```
