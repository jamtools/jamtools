import React from 'react';

import {JamToolsEngine, JamToolsProvider} from '~/core/engine/engine';

import {FrontendRoutes} from '~/platforms/webapp/frontend_routes';

import '~/platforms/webapp/styles.scss';

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
