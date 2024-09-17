import React from 'react';

import {HelloModule} from './hello_module';
import {Button} from '~/core/components/Button';

export const HelloComponent = () => {
    const value = HelloModule.use();

    return (
        <div>
            <h1>
                {'Hello Module!'}
            </h1>
            <Button onClick={() => value.mod.actions.hello()}>
                Hello
            </Button>
            <pre>
                {JSON.stringify(value.state)}
            </pre>
        </div>
    );
};
