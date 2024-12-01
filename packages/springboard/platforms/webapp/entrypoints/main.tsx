import React from 'react';

import {JamToolsEngine, JamToolsProvider} from 'springboard/engine/engine';

import {FrontendRoutes} from '@springboardjs/platforms-browser/frontend_routes';

type Props = {
    engine: JamToolsEngine;
}

export const Main = (props: Props) => {
    return (
        <JamToolsProvider engine={props.engine}>
            <FrontendRoutes/>
        </JamToolsProvider>
    );
};
