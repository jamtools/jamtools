import { trace } from '@opentelemetry/api';

export function traceFunction<T extends (...args: any[]) => any>(functionName: string, fn: T): T {
  return function (...args: Parameters<T>): ReturnType<T> {
    const tracer = trace.getTracer('default');
    let jsonArgs = '';
    try {
        jsonArgs = JSON.stringify(args);
    } catch (e) {

    }
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
            return res;
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
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      span.end();
      throw error;
    }
  } as T;
}
