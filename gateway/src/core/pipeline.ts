import { PipelineContext } from './contract';
import { FastifyRequest, FastifyReply } from 'fastify';

export type Interceptor = (context: PipelineContext) => Promise<void>;

export class PipelineRunner {
    private interceptors: Interceptor[] = [];

    use(interceptor: Interceptor) {
        this.interceptors.push(interceptor);
    }

    async run(context: PipelineContext) {
        if (!context.stepResults) {
            context.stepResults = {};
        }

        for (const interceptor of this.interceptors) {
            try {
                await interceptor(context);
            } catch (error: any) {
                console.error('Pipeline stopped:', error.message);

                // Check if error was intentional (step set error result)
                if (context.stepResults.error) {
                    console.log(`[PIPELINE] Propagating known error: ${context.stepResults.error.code}`);
                    throw error; // Propagate to caller (Server/Fastify)
                }

                // Unexpected error
                throw error;
            }
        }
    }
}

// Helper to match server.ts usage
export const pipelineRunner = async (opts: {
    request: FastifyRequest;
    reply: FastifyReply;
    interceptors: Interceptor[]
}) => {
    const runner = new PipelineRunner();
    for (const i of opts.interceptors) {
        runner.use(i);
    }

    const context: PipelineContext = {
        request: opts.request,
        reply: opts.reply,
        stepResults: {}
    };

    await runner.run(context);
};
