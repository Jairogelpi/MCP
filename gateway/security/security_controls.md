# Security Controls Catalog

## 1. Infrastructure Controls
- **Isolated Compute**: Gateway runs in hardened containers with limited syscall access.
- **Secret Separation**: API secrets and signing keys never appear in logs or environment variables if possible (Vault/KMS recommended).

## 2. Application Controls
- **Replay Protection**:
  - Mandatory `request_id` (UUIDv4).
  - Memory-based LRU cache (1 hour ttl) to block duplicate IDs.
  - Timestamp validation (max 5 minutes drfit).
- **Payload Sanitization**:
  - Max Request Size: 2MB.
  - Recursion depth limit for nested JSON params.
- **Rate Limiting**:
  - **Burst**: 10 req/s per agent.
  - **Sustained**: 100 req/min per tenant.
  - **Economic**: Halt all requests if budget burn exceeds 500% of trend.

## 3. Upstream Safety
- **Anti-SSRF**:
  - Block: `127.0.0.1`, `0.0.0.0`, `169.254.169.254` (AWS/GCP/Azure Metadata).
  - Allowlist: Mandatory domains in `egress_policy`.
- **Response Normalization**: Upstream errors are redacted to prevent stack-trace leaking.
