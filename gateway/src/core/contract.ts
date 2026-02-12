import { FastifyRequest, FastifyReply } from 'fastify';
import { Readable } from 'stream';

// Spec: spec/action_envelope.schema.json

export interface UnifiedRequest {
    id: string;
    source: 'http' | 'sse';
    payload: any;
    headers: any;
    routeParams: {
        tenant: string;
        server: string;
    };
}

export interface ActionEnvelope {
    id: string;
    version: string;
    type: 'command' | 'query';
    action: string;
    parameters: any;
    meta: {
        timestamp: number;
        source: string;
        tenant: string;
        targetServer: string;
        authContext?: any;
        [key: string]: any;
    };
}

// --- POLICY ENGINE TYPES ---

export type RuleEffect = 'allow' | 'deny' | 'transform';

export interface PolicyConditions {
    maxBudget?: number;
    allowedDomains?: string[];
    requiredScopes?: string[];
    [key: string]: any;
}

export interface PolicyTransform {
    redactPII?: string[];
    forceArgs?: Record<string, any>;
    checkEgress?: {
        allowList?: string[];
        blockPrivate?: boolean;
    };
}

export interface PolicyRule {
    id: string;
    description?: string;
    target: {
        tenant?: string;
        server?: string;
        action?: string;
    };
    conditions?: PolicyConditions;
    effect: RuleEffect;
    transform?: PolicyTransform;
    priority?: number;
}

export interface PolicyDecision {
    allow: boolean;
    reason?: string;
    transform?: ActionEnvelope;
    matchedRuleId?: string;
}

// ---------------------------

export interface EconomicReservation {
    reservationId: string;
    resource: string;
    amount: number;
    status: 'reserved' | 'committed' | 'rolled_back';
}

export interface UpstreamResponse {
    result: any;
    upstreamLatency: number;
    isStream?: boolean;
    stream?: Readable;
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
        raw?: any;
        normalized?: ActionEnvelope;
        policy?: PolicyDecision;
        reservation?: EconomicReservation;
        upstream?: UpstreamResponse;
        receipt?: Receipt;
        error?: {
            code: string;
            message: string;
            status: number;
        }
    };
}
