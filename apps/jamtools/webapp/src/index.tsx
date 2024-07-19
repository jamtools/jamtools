import React from 'react';
import ReactDOM from 'react-dom/client';

import {CoreDependencies} from '~/types/module_types';

import {Main} from './main';

window.addEventListener('DOMContentLoaded', () => {
    const rootElem = document.createElement('div');
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);

    const coreDeps: CoreDependencies = {
        log: console.log,
    }

    root.render(<Main coreDeps={coreDeps} />);
});
