import { FastifyRequest, FastifyReply } from 'fastify';
import { Readable } from 'stream';

// Spec: spec/action_envelope.schema.json
// Spec: spec/policy_contract.md

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

export enum PolicyReasonCodes {
    FORBIDDEN_TOOL = 'FORBIDDEN_TOOL',
    BUDGET_HARD_LIMIT = 'BUDGET_HARD_LIMIT',
    PII_DETECTED = 'PII_DETECTED',
    SSRF_BLOCKED = 'SSRF_BLOCKED',
    ARGS_LIMIT_ENFORCED = 'ARGS_LIMIT_ENFORCED',
    TENANT_SCOPE_VIOLATION = 'TENANT_SCOPE_VIOLATION',
    SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
    DEFAULT_ALLOW = 'DEFAULT_ALLOW',
    DEFAULT_DENY = 'DEFAULT_DENY',
    POLICY_VIOLATION = 'POLICY_VIOLATION',
    TRANSFORMED_BY_RULE = 'TRANSFORMED_BY_RULE',
    DENIED_BY_RULE = 'DENIED_BY_RULE',
    ALLOWED_BY_RULE = 'ALLOWED_BY_RULE'
}

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

// Legacy Rule Interface (for backward compat if needed, or remove)
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

// --- ABAC NEW TYPES ---

export interface ABACRule {
    id: string;
    name: string;
    effect: RuleEffect;
    priority: number;
    when: {
        tool_name?: string | { pattern: string };
        role?: string[];
        risk_class?: 'low' | 'medium' | 'high';
        time_restricted?: { start: string; end: string }; // HH:MM (24h)
        [key: string]: any;
    };
    transform?: PolicyTransform;
}

export interface PolicyRuleset {
    tenant_id: string;
    version: string;
    created_at: number;
    rules: ABACRule[];
}

export interface PolicyInput {
    tenant_id: string;
    project_id?: string;
    agent_id: string;
    role?: string; // Added for ABAC
    session_id?: string;
    upstream_server_id: string;
    mcp_method?: string;
    tool_name: string;
    args: any;
    input_schema_hash?: string;
    risk_class?: string;
    timestamp: number;
    request_id: string;
}

export interface PolicyDecision {
    decision: RuleEffect;
    reason_codes: string[]; // Minimum 1
    transform_patch?: any; // Generic patch
    obligations?: string[];

    allow?: boolean;
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
    details?: Partial<UpstreamResponse> & { economic?: any }; // Allow economic details
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
        reservation?: EconomicReservation; // Deprecated but kept for compatibility if needed
        economic?: {
            cost: number;
            currency: string;
            reserve_id?: string;
            budget_scopes?: string[];
        }; // New field
        upstream?: UpstreamResponse;
        receipt?: Receipt;
        error?: {
            code: string;
            message: string;
            status: number;
        }
    };
}
