import React from 'react';
import ReactDOM from 'react-dom/client';

import {CoreDependencies} from '~/types/module_types';

import {Main} from './main';
import {BrowserQwertyService} from './services/browser_qwerty_service';
import {BrowserKVStoreService} from './services/browser_kvstore_service';

window.addEventListener('DOMContentLoaded', () => {
    const qwertyService = new BrowserQwertyService(document);
    const kvStore = new BrowserKVStoreService(localStorage);

    const rootElem = document.createElement('div');
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);

    const coreDeps: CoreDependencies = {
        log: console.log,
        inputs: {
            qwerty: qwertyService,
        },
        kvStore,
    };

    root.render(<Main coreDeps={coreDeps} />);
});
