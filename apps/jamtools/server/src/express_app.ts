import path from 'path';

import express from 'express';
import expressWS from 'express-ws';

import * as trpcExpress from '@trpc/server/adapters/express';

import {NodeJsonRpcServer} from './services/server_json_rpc';
import {WebsocketServerCoreDependencies} from '~/platforms/ws/ws_server_core_dependencies';

export const initApp = (coreDeps: WebsocketServerCoreDependencies) => {
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
        res.sendFile('index.html', {root: webappFolder});
    });

    router.get('/dist/index.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile('index.js', {root: webappDistFolder});
    });

    router.get('/dist/index.js.map', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile('index.js.map', {root: webappDistFolder});
    });

    router.get('/dist/index.css', (req, res) => {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile('index.css', {root: webappDistFolder});
    });

    router.get('/dist/index.css.map', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile('index.css.map', {root: webappDistFolder});
    });

    router.get('/dist/manifest.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile('manifest.json', {root: webappDistFolder});
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

    const createContext = ({
        req,
        res,
    }: trpcExpress.CreateExpressContextOptions) => ({});

    router.use(
        '/trpc',
        trpcExpress.createExpressMiddleware({
            router: coreDeps.kvTrpcRouter,
            createContext,
        }),
    );

    router.get('*', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile('index.html', {root: webappFolder});
    });

    app.use(router);

    return app;
};
