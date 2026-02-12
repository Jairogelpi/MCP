import { PipelineContext } from './contract';

export type Interceptor = (context: PipelineContext) => Promise<void>;

export class PipelineRunner {
    private interceptors: Interceptor[] = [];

    use(interceptor: Interceptor) {
        this.interceptors.push(interceptor);
    }

    async run(context: PipelineContext) {
        for (const interceptor of this.interceptors) {
            try {
                await interceptor(context);
            } catch (error: any) {
                console.error('Pipeline stopped:', error.message);

                // If the error was manually thrown by a step setting stepResults.error, just return (stop pipeline)
                if (context.stepResults.error) {
                    return;
                }

                // Otherwise, it's an unexpected error, propogate up to server.ts
                throw error;
            }
        }
    }
}
