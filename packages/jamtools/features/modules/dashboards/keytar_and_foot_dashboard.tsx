import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';

export default async (moduleAPI: ModuleAPI, dashboardName: string) => {
    const makeMacroName = (name: string) => `${dashboardName}|${name}`;

    const pagedOctaveInput = await moduleAPI.createMacro(moduleAPI, makeMacroName('pagedOctaveInput'), 'musical_keyboard_paged_octave_input', {onTrigger: (event) => {
        console.log('from midi playback module. paged input macro.', event.event);
    }});

    moduleAPI.registerRoute(dashboardName, {}, () => (
        <div>
            <h1>
                Keytar and Foot Dashboard
            </h1>

            <p>Paged octave input:</p>
            <div>
                <pagedOctaveInput.components.edit/>
            </div>
        </div>
    ));
};
