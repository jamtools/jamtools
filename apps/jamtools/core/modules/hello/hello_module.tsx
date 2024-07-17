import React from 'react';

export class HelloModule {
    static moduleId = 'hello';

    static Component = () => {
        return (
            <div>
                I'm the hello module!
            </div>
        );
    }
}
