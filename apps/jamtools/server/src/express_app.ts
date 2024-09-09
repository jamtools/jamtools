import path from 'path';
import {WebSocketServer} from 'ws';

import express from 'express';

import {NodeJsonRpcServer} from './services/node_json_rpc';

export const initApp = () => {
    const app = express();

    const router = express.Router();

    const webappFolder = path.join(__dirname, '../../webapp');
    const webappDistFolder = path.join(webappFolder, './dist');

    const wss = new WebSocketServer({port: 8080});
    const service = new NodeJsonRpcServer(wss);
    service.initialize();

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
