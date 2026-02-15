# Redaction Rules for Logging

To comply with Privacy regulations (GDPR, etc.) and the Objectivity Contract, the following rules apply to all logs:

## 1. Strictly Forbidden (NEVER LOG)
- **Raw Payloads**: The full body of `parameters` or `result` should never be logged at INFO level.
- **Auth Tokens**: `Authorization` headers, API keys, or any credential string.
- **PII Fields**: Any field known to contain PII (email, phone, ssn, credit_card).

## 2. Safe to Log
- **Metadata**: `tenant_id`, `tool_name`, `request_id`, `trace_id`.
- **Quantities**: `cost`, `latency_ms`, `token_count`.
- **Status Codes**: HTTP status, internal error codes (e.g. `ECON_RATE_LIMIT`).
- **Hashes**: Cryptographic hashes of data (e.g. `receipt_hash`).

## 3. Redaction Strategy
If a log must contain dynamic data (e.g. for debugging errors), it must be passed through a redaction filter:
- **Emails**: Replace with `[REDACTED_EMAIL]` or hash `sha256(email)`.
- **Names**: Replace with `[REDACTED_NAME]`.
- **Numbers**: detailed financial account numbers must be masked `****-1234`.

## 4. Implementation
The `logger` module must interpret these rules.
- `logger.info(event, { ...safe_data })` -> Production safe.
- `logger.debug(event, { ...raw_data })` -> Dev only (never in production).
