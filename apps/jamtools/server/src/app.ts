import 'source-map-support/register';

import 'express-async-errors';
const hey = (shouldError: boolean) => yep(shouldError);
import './tracing';
const yep = (shouldError: boolean) => other_trace(shouldError);
import express, {NextFunction, Request, Response} from 'express';

import {context, SpanStatusCode, trace} from '@opentelemetry/api';

const app = express();

app.use(async function myMiddleware(req, res, next) {
    await fromMiddleware_trace();
    next();
});

app.get('/', async (req, res) => {
    await hey(false);
    res.json({yeah: 'buddy'});
});

app.get('/error', async (req, res) => {
    await hey(true);
    res.json({yeah: 'buddy'});
});

// Global error handler to capture unhandled exceptions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err);

    const activeContext = context.active();
    const span = trace.getSpan(activeContext);
    if (span) {
        span.recordException(err);
        span.setStatus({code: SpanStatusCode.ERROR, message: err.message});
        span.end();
    }
    res.status(500).json({error: err.message});
});

const fromMiddleware_trace = async () => {
    return new Promise((r) => {
        setTimeout(r, 3000);
    });
};

const other_trace = async (shouldError: boolean) => {
    if (shouldError) {
        const x = undefined;
        (x as unknown as string).toUpperCase();
    }

    const randomWait = Math.random() * 1000 * 10;
    return new Promise((r) => {
        setTimeout(r, randomWait);
    });
};

app.listen('1337', () => {
    console.log('http://localhost:1337');
    console.log('http://localhost:1337/error');
});
