# Economic Engine Contract (v0.1.0)

This document defines the interface for the Economic Engine ("Soft" Phase).

## 1. Inputs

The Economic Engine requires the following context to make a decision.

```typescript
interface EconomicInput {
    // Identity & Scope
    tenant_id: string;
    project_id?: string;
    agent_id: string;
    session_id?: string;
    
    // Operation Context
    tool_name: string;
    upstream_server_id: string;
    args: any;          // Used for token estimation
    risk_class: string; // May affect pricing/budget policy

    // Pricing Context (Determined by Catalog/Upstream)
    pricing_context: {
        provider: string; // e.g. "openai", "anthropic", "internal"
        model?: string;   // e.g. "gpt-4"
        endpoint?: string;// e.g. "chat/completions"
        region?: string;  // e.g. "us-east-1"
        tier?: string;    // e.g. "standard", "high-performance"
    };

    // Budget Scopes (Resolved by Policy/Config)
    budget_scopes: string[]; // IDs of budgets to check (e.g. "tenant-acme", "project-123")
}
```

## 2. Outputs

The result of the `EconomicDecider.evaluate()` method.

```typescript
interface EconomicDecision {
    outcome: 'allow' | 'deny' | 'degrade' | 'require_approval';
    
    // Estimation
    estimated_tokens_in: number;
    estimated_tokens_out: number; // Project/Heuristic
    estimated_cost: number;
    currency: string; // e.g. "USD", "EUR"
    
    // Metadata
    pricing_version: string;
    reason_codes: EconomicReasonCode[];
    
    // Actions
    degrade_patch?: any; // e.g. { model: "gpt-3.5-turbo" } or { max_tokens: 100 }
    
    // Approval (Workflow)
    approval_hint?: {
        threshold: number;
        reason: string;
    };
}
```

## 3. Reason Codes

Standard error/status codes for economic decisions.

```typescript
enum EconomicReasonCode {
    BUDGET_HARD_LIMIT = 'BUDGET_HARD_LIMIT',       // Deny: Absolute limit reached
    BUDGET_SOFT_LIMIT = 'BUDGET_SOFT_LIMIT',       // Allow+Warn: Notification threshold exceeded
    PRICING_NOT_FOUND = 'PRICING_NOT_FOUND',       // Deny/Warn: Cannot calculate cost
    COST_ESTIMATION_FAILED = 'COST_ESTIMATION_FAILED', // Deny/Warn: Args invalid for est
    DEGRADE_APPLIED = 'DEGRADE_APPLIED',           // Degrade: Quality reduced to save cost
    APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',       // Require Approval: High cost
    ECON_RATE_LIMIT = 'ECON_RATE_LIMIT'            // Deny: Spending too fast (€/hr)
}
```
