import 'source-map-support/register';

import 'express-async-errors';
const hey = () => yep();
import './tracing';
const yep = () => other_trace();
import express, {NextFunction, Request, Response} from 'express';

import {context, SpanStatusCode, trace} from '@opentelemetry/api';

const app = express();

app.use(async function myMiddleware(req, res, next) {
    await fromMiddleware_trace();
    next();
});

app.get('/', async (req, res) => {
    // await yeah_trace();
    await hey();
    res.json({yeah: 'buddy'});
});

// Global error handler to capture unhandled exceptions
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
}

const yeah_trace = async () => {
    return new Promise((r) => {
        setTimeout(r, 1000);
    });
}

const other_trace = async () => {
    // const x = undefined;
    // (x as unknown as string).toUpperCase();
    const randomWait = Math.random() * 1000 * 10;
    return new Promise((r) => {
        setTimeout(r, randomWait);
    });
}

app.listen('1337', () => {
    console.log('http://localhost:1337');
});
