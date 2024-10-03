import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';
import {MidiEventFull} from '~/core/modules/macro_module/macro_module_types';

export default async (moduleAPI: ModuleAPI, dashboardName: string) => {
    const makeMacroName = (name: string) => `${dashboardName}|${name}`;

    const pagedOctaveOutput = await moduleAPI.createMacro(moduleAPI, makeMacroName('pagedOctaveOutput'), 'musical_keyboard_output', {});

    const pagedOctaveInput = await moduleAPI.createMacro(moduleAPI, makeMacroName('pagedOctaveInput'), 'musical_keyboard_paged_octave_input', {onTrigger: (event) => {
        // console.log('from midi playback module. paged input macro.', event.event);
        // savedEvent.setState(event);

        pagedOctaveOutput.send(event.event);
    }});

    const savedEvent = await moduleAPI.statesAPI.createSharedState<MidiEventFull | null>('savedEvent', null);

    moduleAPI.registerRoute(dashboardName, {}, () => (
        <div>
            <h1>
                Keytar and Foot Dashboard
            </h1>

            <p>Paged octave input:</p>
            <div>
                <pagedOctaveInput.components.edit/>
            </div>

            <p>Paged octave output:</p>
            <div>
                <pagedOctaveOutput.components.edit/>
            </div>

            <pre>
                {JSON.stringify(savedEvent.useState(), null, 2)}
            </pre>
        </div>
    ));
};
