import { trace, context } from '@opentelemetry/api';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogPayload {
    [key: string]: any;
}

class Logger {
    private write(level: LogLevel, event: string, payload: LogPayload = {}) {
        const span = trace.getSpan(context.active());
        const traceId = span?.spanContext().traceId;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            event,
            trace_id: traceId,
            ...payload
        };

        console.log(JSON.stringify(logEntry));
    }

    info(event: string, payload?: LogPayload) {
        this.write('info', event, payload);
    }

    warn(event: string, payload?: LogPayload) {
        this.write('warn', event, payload);
    }

    error(event: string, payload?: LogPayload) {
        this.write('error', event, payload);
    }

    debug(event: string, payload?: LogPayload) {
        if (process.env.LOG_LEVEL === 'debug') {
            this.write('debug', event, payload);
        }
    }
}

export const logger = new Logger();
