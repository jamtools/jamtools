import React from 'react';

import {JamToolsEngine, JamToolsProvider} from 'jamtools-core/engine/engine';

import {FrontendRoutes} from 'jamtools-platforms-webapp/frontend_routes';

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
