import fastify from 'fastify';
import { PipelineRunner } from './core/pipeline';
import { PipelineContext, UnifiedRequest } from './core/contract';

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

// Route definition according to Spec v0.1.0
server.post('/mcp/:tenant/:server', async (request, reply) => {
    const { tenant, server: targetServer } = request.params as { tenant: string; server: string };

    const context: PipelineContext = {
        request,
        reply,
        stepResults: {
            // Initialize with route params for use in Normalize step
            raw: {
                ...(request.body as any),
                _routeParams: { tenant, server: targetServer }
            }
        }
    };

    try {
        await pipeline.run(context);

        // Check for handled errors in pipeline
        if (context.stepResults.error) {
            const { status, ...errBody } = context.stepResults.error;
            return reply.status(status).send({ error: errBody });
        }

        // Success response
        return context.stepResults.receipt;

    } catch (error) {
        // Unhandled internal error
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
        await server.listen({ port: 3000 });
        console.log('Server running at http://localhost:3000');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
