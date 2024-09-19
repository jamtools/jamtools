import React from 'react';

import {jamtools} from '~/core/engine/register';

jamtools.registerModule('lobby', {}, async (moduleAPI) => {
    moduleAPI.registerRoute('/', {}, () => {
        return (
            <div>
                - enter your name optionally
                - Some info about your current lobby. in shared state
                - Create a new lobby. creates a new websocket room
            </div>
        );
    });
});
