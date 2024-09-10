import path from 'path';

import express from 'express';
import expressWS from 'express-ws';

import {NodeJsonRpcServer} from './services/node_json_rpc';

export const initApp = (port: string) => {
    const app = express();

    const ws = expressWS(app);

    const router = express.Router();

    const webappFolder = path.join(__dirname, '../../webapp');
    const webappDistFolder = path.join(webappFolder, './dist');

    const service = new NodeJsonRpcServer();

    ws.app.ws('/ws', (ws, req) => {
        service.handleConnection(ws, req);
    });

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
