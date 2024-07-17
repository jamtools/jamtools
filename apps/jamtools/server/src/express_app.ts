import path from 'path';

import express from 'express';

export const initApp = () => {
    const app = express();

    const router = express.Router();

    const webappFolder = path.join(__dirname, '../../webapp');
    const webappDistFolder = path.join(webappFolder, './dist');

    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile('index.html', { root: webappFolder });
    });

    router.get('/dist/index.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        console.log(webappDistFolder);
        res.sendFile('index.js', { root: webappDistFolder });
    });

    router.get('*', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile('index.html', { root: webappFolder });
    });

    app.use(router);

    return app;
};
