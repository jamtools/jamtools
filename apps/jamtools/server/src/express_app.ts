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

    router.post('/v1/traces', express.json(), async (req, res) => {
        const host = process.env.OTEL_HOST;
        if (!host) {
            res.json({message: 'No otel host set up via env var'});
            return;
        }

        try {
            const response = await fetch(`${host}/v1/traces`, {
                method: 'POST',
                body: JSON.stringify(req.body),
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(1000),
            });

            const responseText = await response.text();
            res.send(responseText);
        } catch (e) {
            res.json({message: 'failed to contact otel host'});
        }
    });

    router.get('*', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile('index.html', { root: webappFolder });
    });

    app.use(router);

    return app;
};
