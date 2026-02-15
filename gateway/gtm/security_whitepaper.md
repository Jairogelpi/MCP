# Security Whitepaper

## 1. Architecture
- **Zero Trust**: Every request must be authenticated and authorized via RBAC.
- **Isolation**: Strict multi-tenant data boundaries enforced at the database level.

## 2. Threat Mitigation
- **SSRF**: Private IP blocking and DNS rebinding protection.
- **Replay Attacks**: 5-minute clock skew window and UUID deduplication.
- **DDoS**: Token bucket rate limiting at User, Agent, and Tenant scopes.

## 3. Cryptography
- **Signatures**: Ed25519 for high-speed, secure receipt signing.
- **Keys**: API Keys are hashed (SHA-256) before storage; raw keys never persist.
- **Transport**: TLS 1.3 mandated for all ingress/egress.

## 4. Compliance
- **SOC2**: Controls mapped to CC6 (Security) and CC7 (Availability).
- **GDPR**: "Right to be Forgotten" implemented via `RetentionManager` and `Purge` jobs.
