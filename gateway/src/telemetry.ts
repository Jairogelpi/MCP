import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

// Ensure service name is set
process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'mcp-gateway';
const OTEL_COLLECTOR_URL = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces';
const OTEL_METRICS_URL = process.env.OTEL_METRICS_URL || 'http://localhost:4318/v1/metrics';

const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
        url: OTEL_COLLECTOR_URL,
        timeoutMillis: 1000,
    }),
    metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: OTEL_METRICS_URL,
        }),
        exportIntervalMillis: 10000,
    }),
    instrumentations: [
        new HttpInstrumentation(),
    ],
});

export function startTelemetry() {
    try {
        sdk.start();
        console.log('[TELEMETRY] SDK Started (OTLP enabled)');
    } catch (error) {
        console.error('[TELEMETRY] Failed to start SDK (Fail-Open active):', error);
    }
}

export async function shutdownTelemetry() {
    await sdk.shutdown();
    console.log('🔭 OpenTelemetry SDK shut down');
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    shutdownTelemetry()
        .then(() => console.log('Telemetry terminated'))
        .catch((error) => console.log('Error terminating telemetry', error))
        .finally(() => process.exit(0));
});
