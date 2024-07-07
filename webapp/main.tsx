import React from 'react';
import ReactDOM from 'react-dom/client';

window.addEventListener('DOMContentLoaded', () => {
    const rootElem = document.createElement('div');
    document.body.appendChild(rootElem);

    const root = ReactDOM.createRoot(rootElem);
    const App = () => (
        <div>
            <h1>Jam Tools!</h1>
        </div>
    );

    root.render(<App />);
});
