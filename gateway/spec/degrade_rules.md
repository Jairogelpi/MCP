# Degradation & Approval Rules (v0.1.0)

## Overview
Defines rules for "Soft Economic Enforcement". When a budget Soft Limit is exceeded, or a request is deemed "expensive", the system can:
1.  **Degrade**: Switch to a cheaper model (e.g., GPT-4 -> GPT-3.5) or reduce limits.
2.  **Require Approval**: Block execution until human approval is obtained (Phase 3 returns 402/APPROVAL_REQUIRED).

## Data Model

### Rule Structure
```yaml
rules:
  - id: "rule_id"
    condition:
      type: "soft_limit" | "high_cost" | "always"
      threshold: number (optional)
      target_model: "string" (optional matching)
    action:
      type: "degrade" | "require_approval"
      patch:
        model: "new_model"
```

## Logic
1. Rules are evaluated in order. First match wins.
2. If `soft_limit` is exceeded -> Look for a matching rule.
3. If `cost > threshold` -> Look for matching rule.

## Output
A `DegradationPlan` containing:
- `action`: `degrade` | `require_approval` | `none`
- `patch`: Partial object to merge into ActionEnvelope (e.g. `{ parameters: { model: "gpt-3.5-turbo" } }`)
