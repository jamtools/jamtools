import React from 'react';
import ReactDOM from 'react-dom/client';

import {Main} from './main';

window.addEventListener('DOMContentLoaded', () => {
    const rootElem = document.createElement('div');
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);

    root.render(<Main />);
});
