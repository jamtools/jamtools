# MIDI IO

The MIDI IO module exposes functionality for listening to MIDI input devices and communicating to MIDI output devices. Using this module, the application needs no boilerplate code for MIDI device initialization or polling.

Example of using the MIDI IO module's `midiInputSubject` to subscribe to all incoming midi events for any plugged in MIDI devices.

```jsx
import React from 'react';

import springboard from 'springboard';
import {MidiEventFull} from '@jamtools/core/modules/macro_module/macro_module_types';

import '@jamtools/core/modules/io/io_module';

springboard.registerModule('Main', {}, async (moduleAPI) => {
    const mostRecentMidiEvent = await moduleAPI.statesAPI.createSharedState<MidiEventFull | null>('mostRecentMidiEvent', null);
    const ioModule = moduleAPI.deps.module.moduleRegistry.getModule('io');

    // Subscribe to all midi input events
    ioModule.midiInputSubject.subscribe(event => {
        mostRecentMidiEvent.setState(event);
    });

    moduleAPI.registerRoute('', {}, () => {
        const midiEvent = mostRecentMidiEvent.useState();

        return (
            <div>
                {midiEvent && (
                    <pre>
                        {JSON.stringify(midiEvent, null, 2)}
                    </pre>
                )}
            </div>
        );
    });
});
```