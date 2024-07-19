import React from 'react';

import {JamToolsProvider} from '~/engine/engine';

import {FrontendRoutes} from './frontend_routes';
import {CoreDependencies} from '~/types/module_types';

type Props = {
    coreDeps: CoreDependencies;
}

export const Main = (props: Props) => {
    return (
        <JamToolsProvider coreDeps={props.coreDeps}>
            <FrontendRoutes/>
        </JamToolsProvider>
    );
};
