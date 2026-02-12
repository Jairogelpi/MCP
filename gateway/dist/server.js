"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const pipeline_1 = require("./core/pipeline");
// Import all interceptors
const _01_parse_validate_1 = require("./interceptors/01_parse_validate");
const _02_normalize_1 = require("./interceptors/02_normalize");
const _03_policy_1 = require("./interceptors/03_policy");
const _04_economic_1 = require("./interceptors/04_economic");
const _05_forward_1 = require("./interceptors/05_forward");
const _06_capture_1 = require("./interceptors/06_capture");
const _07_receipt_1 = require("./interceptors/07_receipt");
const _08_telemetry_1 = require("./interceptors/08_telemetry");
const server = (0, fastify_1.default)();
// Initialize Pipeline
const pipeline = new pipeline_1.PipelineRunner();
pipeline.use(_01_parse_validate_1.parseValidate);
pipeline.use(_02_normalize_1.normalize);
pipeline.use(_03_policy_1.policy);
pipeline.use(_04_economic_1.economic);
pipeline.use(_05_forward_1.forward);
pipeline.use(_06_capture_1.capture);
pipeline.use(_07_receipt_1.receiptInteractor);
pipeline.use(_08_telemetry_1.telemetry);
server.post('/mcp/:tenant/:server', async (request, reply) => {
    const { tenant, server: targetServer } = request.params;
    const context = {
        request,
        reply,
        stepResults: {
            raw: {
                ...request.body,
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
    }
    catch (error) {
        request.log.error(error);
        reply.status(500).send({
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message,
                requestId: request.id
            }
        });
    }
});
const start = async () => {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' }); // 0.0.0.0 for Docker
        console.log('Server running at http://0.0.0.0:3000');
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
