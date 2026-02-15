import { Interceptor } from '../core/pipeline';
import { PipelineContext } from '../core/contract';

/**
 * Interceptor 02b: WAF (Web Application Firewall)
 * Inspects MCP parameters for potential injection or malicious payloads.
 */
export const waf: Interceptor = async (context: PipelineContext) => {
    const envelope = context.stepResults.normalized;
    if (!envelope) return;

    const params = JSON.stringify(envelope.parameters);

    // 1. Basic SQLi Detection (simple patterns for MVP)
    const sqliPatterns = [
        /UNION\s+SELECT/i,
        /OR\s+1=1/i,
        /DROP\s+TABLE/i,
        /--/ // SQL comments
    ];

    // 2. XSS Detection
    const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /onload=/i
    ];

    // 3. Path Traversal
    const pathTraversal = /\.\.\//i;

    const allPatterns = [...sqliPatterns, ...xssPatterns, pathTraversal];

    for (const pattern of allPatterns) {
        if (pattern.test(params)) {
            const { logger } = require('../core/logger');
            logger.warn('safeguard_violation', {
                tenant_id: envelope.meta.tenant,
                tool_name: envelope.action,
                reason: 'WAF_MALICIOUS_PAYLOAD',
                pattern: pattern.toString()
            });

            throw new Error('MALICIOUS_PAYLOAD_DETECTED');
        }
    }

    return;
};
