"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineRunner = void 0;
class PipelineRunner {
    interceptors = [];
    use(interceptor) {
        this.interceptors.push(interceptor);
    }
    async run(context) {
        for (const interceptor of this.interceptors) {
            try {
                await interceptor(context);
            }
            catch (error) {
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
exports.PipelineRunner = PipelineRunner;
