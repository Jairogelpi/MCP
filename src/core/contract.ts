import { FastifyRequest, FastifyReply } from 'fastify';

// Spec: spec/action_envelope.schema.json

export interface UnifiedRequest {
    id: string;
    source: 'http' | 'sse';
    payload: any;
    headers: any;
    // Context info derived from route/headers early on
    routeParams: {
        tenant: string;
        server: string;
    };
}

export interface ActionEnvelope {
    id: string; // UUID trace id
    version: string; // "0.1.0"
    type: 'command' | 'query';
    action: string; // Tool name
    parameters: any;
    meta: {
        timestamp: number;
        source: string; // IP or Client ID
        tenant: string;
        targetServer: string;
        authContext?: any; // Populated by Auth Step
        [key: string]: any; // Extensible for other interceptors
    };
}

export interface PolicyDecision {
    allow: boolean;
    reason?: string; // Should map to Error Codes like POLICY_DENY
    transform?: ActionEnvelope;
}

export interface EconomicReservation {
    reservationId: string;
    resource: string;
    amount: number;
    status: 'reserved' | 'committed' | 'rolled_back';
}

export interface UpstreamResponse {
    result: any;
    upstreamLatency: number;
}

export interface Receipt {
    transactionId: string;
    status: 'success' | 'failure';
    error?: {
        code: string;
        message: string;
    };
    details?: UpstreamResponse;
    cost: number;
    timestamp: number;
}

export interface PipelineContext {
    request: FastifyRequest;
    reply: FastifyReply;
    stepResults: {
        raw?: any; // Payload received
        normalized?: ActionEnvelope;
        policy?: PolicyDecision;
        reservation?: EconomicReservation;
        upstream?: UpstreamResponse;
        receipt?: Receipt;
        error?: { // Captured error for standardized response
            code: string;
            message: string;
            status: number;
        }
    };
}
