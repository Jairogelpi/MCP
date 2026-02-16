// Derived from spec/error_codes.md

export enum ErrorCode {
    // 1. Auth & Identity
    AUTH_REQUIRED = 'AUTH_REQUIRED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    INVALID_IDENTITY = 'INVALID_IDENTITY',
    TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
    ADMIN_ROLE_REQUIRED = 'ADMIN_ROLE_REQUIRED',

    // 2. Policy & Governance
    POLICY_VIOLATION = 'POLICY_VIOLATION',
    POLICY_DENY = 'POLICY_DENY',
    FORBIDDEN_TOOL = 'FORBIDDEN_TOOL',
    APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',

    // 3. Economics
    BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
    BUDGET_HARD_LIMIT = 'BUDGET_HARD_LIMIT',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',

    // 4. Infrastructure & Upstreams
    UPSTREAM_NOT_FOUND = 'UPSTREAM_NOT_FOUND',
    UPSTREAM_FAILED = 'UPSTREAM_FAILED',
    BAD_GATEWAY = 'BAD_GATEWAY',
    SSRF_BLOCKED = 'SSRF_BLOCKED',

    // 5. Validation
    SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
    INVALID_ARGS = 'INVALID_ARGS',
    PII_DETECTED = 'PII_DETECTED',

    // Generic
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export const ErrorCodeLabels: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_REQUIRED]: 'Authentication is required to access this resource.',
    [ErrorCode.INVALID_TOKEN]: 'The provided token is invalid or expired.',
    [ErrorCode.INVALID_IDENTITY]: 'Identity could not be verified.',
    [ErrorCode.TENANT_ACCESS_DENIED]: 'You do not have access to this tenant.',
    [ErrorCode.ADMIN_ROLE_REQUIRED]: 'Administrator privileges are required.',
    [ErrorCode.POLICY_VIOLATION]: 'The request violated a system policy.',
    [ErrorCode.POLICY_DENY]: 'The operation was denied by a specific policy rule.',
    [ErrorCode.FORBIDDEN_TOOL]: 'This tool is not permitted for your role.',
    [ErrorCode.APPROVAL_REQUIRED]: 'Human approval is required for this action.',
    [ErrorCode.BUDGET_EXCEEDED]: 'Budget limits have been exceeded.',
    [ErrorCode.BUDGET_HARD_LIMIT]: 'Hard budget limit reached. Operation blocked.',
    [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds/tokens for this operation.',
    [ErrorCode.UPSTREAM_NOT_FOUND]: 'The requested upstream service could not be found.',
    [ErrorCode.UPSTREAM_FAILED]: 'The upstream service failed to respond correctly.',
    [ErrorCode.BAD_GATEWAY]: 'Gateway error while contacting upstream.',
    [ErrorCode.SSRF_BLOCKED]: 'Request blocked by Egress Control (SSRF protection).',
    [ErrorCode.SCHEMA_MISMATCH]: 'The request format does not match the schema.',
    [ErrorCode.INVALID_ARGS]: 'Arguments provided are invalid.',
    [ErrorCode.PII_DETECTED]: 'Personally Identifiable Information (PII) was detected.',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'An internal server error occurred.'
};
