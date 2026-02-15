# MEP-0002: Backward Compatibility Policy

| Metadata | Value |
| :--- | :--- |
| **Title** | Backward Compatibility Rules |
| **Author** | Architecture Team |
| **Status** | Active |

## 1. Motivation
To prevent ecosystem fragmentation and ensure long-term stability for integrators.

## 2. Specification Changes
- **MUST** ignore unknown fields in JSON payloads.
- **MUST NOT** rename or remove existing fields without a major version bump.
- **SHOULD** provide 2-release deprecation warning headers (`X-Deprecation-Warning`).

## 3. Compatibility Impact
Existing strict parsers may break if they do not adopt "ignore unknown".

## 4. Test Cases
- Send payload with `{ "unknown_field": 1 }`.
- Verify `200 OK` and correct processing of known fields.
