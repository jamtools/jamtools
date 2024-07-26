import React from 'react';

import {HelloModule} from './hello_module';

export const HelloComponent = () => {
    const value = HelloModule.use();

    return (
        <div>
            <h1>
                {'Hello Module!'}
            </h1>
            <button onClick={() => value.mod.actions.hello()}>
                Hello
            </button>
            <pre>
                {JSON.stringify(value.state)}
            </pre>
        </div>
    );
};
