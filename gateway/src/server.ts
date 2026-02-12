import fastify from 'fastify';
import { PipelineRunner } from './core/pipeline';
import { PipelineContext } from './core/contract';

// Import all interceptors
import { parseValidate } from './interceptors/01_parse_validate';
import { normalize } from './interceptors/02_normalize';
import { policy } from './interceptors/03_policy';
import { economic } from './interceptors/04_economic';
import { forward } from './interceptors/05_forward';
import { capture } from './interceptors/06_capture';
import { receiptInteractor } from './interceptors/07_receipt';
import { telemetry } from './interceptors/08_telemetry';

const server = fastify();

// Initialize Pipeline
const pipeline = new PipelineRunner();
pipeline.use(parseValidate);
pipeline.use(normalize);
pipeline.use(policy);
pipeline.use(economic);
pipeline.use(forward);
pipeline.use(capture);
pipeline.use(receiptInteractor);
pipeline.use(telemetry);

server.post('/mcp/:tenant/:server', async (request, reply) => {
    const { tenant, server: targetServer } = request.params as { tenant: string; server: string };

    const context: PipelineContext = {
        request,
        reply,
        stepResults: {
            raw: {
                ...(request.body as any),
                _routeParams: { tenant, server: targetServer }
            }
        }
    };

    try {
        await pipeline.run(context);

        if (context.stepResults.error) {
            const { status, ...errBody } = context.stepResults.error;
            return reply.status(status).send({ error: errBody });
        }

        // Check for Streaming
        if (context.stepResults.upstream?.isStream) {
            // Stream headers are already set in forward.ts or here
            // reply.header('Content-Type', 'text/event-stream'); // done in forward

            // Return the stream (which includes injected Receipt)
            return reply.send(context.stepResults.upstream.stream);
        }

        // Standard JSON Response
        return context.stepResults.receipt;

    } catch (error) {
        request.log.error(error);
        reply.status(500).send({
            error: {
                code: 'INTERNAL_ERROR',
                message: (error as Error).message,
                requestId: request.id
            }
        });
    }
});

const start = async () => {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' }); // 0.0.0.0 for Docker
        console.log('Server running at http://0.0.0.0:3000');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
