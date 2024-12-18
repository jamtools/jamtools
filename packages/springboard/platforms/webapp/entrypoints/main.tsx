import React from 'react';

import {Springboard, SpringboardProvider} from 'springboard/engine/engine';

import {FrontendRoutes} from '@springboardjs/platforms-browser/frontend_routes';

type Props = {
    engine: Springboard;
}

export const Main = (props: Props) => {
    return (
        <SpringboardProvider engine={props.engine}>
            <FrontendRoutes/>
        </SpringboardProvider>
    );
};
