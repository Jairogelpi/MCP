import { Interceptor } from '../core/pipeline';
import { Readable } from 'stream';

export const forward: Interceptor = async (ctx) => {
    console.log('[5] Forward to Upstream');

    const envelope = ctx.stepResults.normalized;
    if (!envelope) return;

    const isStreamingAction = envelope.action.includes('stream');

    if (isStreamingAction) {
        // Capture simple closure
        const env = envelope;

        async function* generateEvents() {
            const chunks = ['chunk1', 'chunk2', 'chunk3', 'done'];
            let costParams = 0;

            for (const chunk of chunks) {
                // Removed await to test fast streaming
                yield `id: ${env.id}-${costParams}\ndata: ${JSON.stringify({ content: chunk })}\n\n`;
                costParams++;
            }
        }

        const stream = Readable.from(generateEvents());

        ctx.reply.header('Content-Type', 'text/event-stream');
        ctx.reply.header('Cache-Control', 'no-cache');
        ctx.reply.header('Connection', 'keep-alive');

        ctx.stepResults.upstream = {
            isStream: true,
            stream: stream,
            result: null,
            upstreamLatency: 0
        };

    } else {
        console.log(`[FORWARD] Calling stub for ${envelope.action}`);
        await new Promise(resolve => setTimeout(resolve, 50));

        ctx.stepResults.upstream = {
            isStream: false,
            result: { status: 'executed', data: `Result for ${envelope.action}` },
            upstreamLatency: 50
        };
    }
};
