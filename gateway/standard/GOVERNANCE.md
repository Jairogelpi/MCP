# MCP Financial Standard Governance

## 1. Philosophy
The MCP Financial Standard aims to provide a universal, interoperable layer for agentic economic settlement. Stability and backward compatibility are paramount.

## 2. Change Process (RFCs)
All substantive changes to the standard (Spec, Schema, Behavior) must go through the **MEP (MCP Enhancement Proposal)** process.
- **Draft**: Initial proposal posted for community review.
- **Review**: Steering committee and maintainers review technical feasibility and alignment.
- **Last Call**: Final period for objections.
- **Accepted**: Merged into the standard.
- **Rejected**: Reason provided.

## 3. Versioning (SemVer)
We follow Semantic Versioning 2.0.0.
- **Major (X.y.z)**: Breaking changes (require MEP approval and coordination).
- **Minor (x.Y.z)**: Backward-compatible additions (e.g., new optional fields).
- **Patch (x.y.Z)**: Backward-compatible bug fixes or clarifications.

## 4. Compatibility Policy
### 4.1 Backward Compatibility
- We commit to **backward compatibility** for at least 2 major versions.
- Existing fields/endpoints cannot be removed without a deprecation warning in the previous major version.

### 4.2 Forward Compatibility
- **"Must Ignore Unknown Fields"**: All compliant parsers (SDKs, Gateways) MUST ignore unknown JSON fields in payloads. This allows adding new fields without breaking old clients.

### 4.3 Deprecation
- Deprecated features must be announced in the release notes.
- A "Sunset Header" or warning log may be used to inform users of upcoming removal.
