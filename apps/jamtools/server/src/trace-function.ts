import { trace } from '@opentelemetry/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function traceFunction<T extends (...args: unknown[]) => any>(functionName: string, fn: T): T {
    return function (...args: Parameters<T>): ReturnType<T> | Promise<ReturnType<T>> {
        const tracer = trace.getTracer('default');
        let jsonArgs = '';
        try {
            jsonArgs = JSON.stringify(args);
            // eslint-disable-next-line no-empty
        } catch (e) {}

        const span = tracer.startSpan(functionName, {
            attributes: {
                'custom.arguments': jsonArgs,
            },
        });

        try {
            const result = fn.apply(this, args);
            if (result instanceof Promise) {
                return result
                    .then(res => {
                        span.end();
                        return res as ReturnType<T>;
                    })
                    .catch(err => {
                        span.recordException(err);
                        span.setStatus({ code: 2, message: err.message });
                        span.end();
                        throw err;
                    });
            } else {
                span.end();
                return result;
            }
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(error as string);

            span.recordException(err);
            span.setStatus({ code: 2, message: err.message });
            span.end();
            throw error;
        }
    } as T;
}
