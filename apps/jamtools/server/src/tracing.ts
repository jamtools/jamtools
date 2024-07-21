// src/tracing.ts
import {NodeSDK} from '@opentelemetry/sdk-node';
import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {Resource} from '@opentelemetry/resources';
import {SemanticResourceAttributes} from '@opentelemetry/semantic-conventions';
import {BatchSpanProcessor, SpanProcessor, ReadableSpan, SimpleSpanProcessor} from '@opentelemetry/sdk-trace-base';
import {NodeTracerProvider} from '@opentelemetry/sdk-trace-node';

// Custom Span Processor to filter out short spans
class FilteringSpanProcessor extends SimpleSpanProcessor {
  onEnd(span: ReadableSpan): void {
    const durationMs =
      span.endTime[0] * 1000 + span.endTime[1] / 1e6 - (span.startTime[0] * 1000 + span.startTime[1] / 1e6);
    const MIN_DURATION_MS = 1; // Minimum duration threshold in milliseconds
    if (durationMs >= MIN_DURATION_MS) {
      super.onEnd(span);
    }
  }
}

const exporterOptions = {
  url: 'http://localhost:4318/v1/traces',
};

const traceExporter = new OTLPTraceExporter(exporterOptions);
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'node_app',
  }),
});

// Add the custom FilteringSpanProcessor
provider.addSpanProcessor(new FilteringSpanProcessor(traceExporter));
provider.register();

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'node_app',
  }),
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error: unknown) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

console.log('Tracing initialized');
