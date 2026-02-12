# PII Patterns Specification

This document defines the PII (Personally Identifiable Information) patterns that the PII Transformer must detect and redact.

## 1. Key-Based Detection
If a JSON key matches (case-insensitive) any of the following, the value must be redacted regardless of content:
- `password`
- `passwd`
- `secret`
- `token`
- `api_key`
- `credit_card`
- `cc_number`
- `ssn`
- `social_security`

## 2. Value-Based Detection (Regex)
The system scans string values for the following patterns.

### Email
- **Pattern**: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`
- **Example**: `user@example.com`

### Credit Card Numbers
- **Pattern**: `\b(?:\d[ -]*?){13,19}\b`
- **Note**: Matches generic sequences of 13-19 digits, potentially separated by spaces or dashes.
- **Example**: `4111 1111 1111 1111`

### Social Security Number (US)
- **Pattern**: `\b\d{3}-\d{2}-\d{4}\b`
- **Example**: `123-45-6789`

## 3. Redaction Strategy
- **Replacement**: `***REDACTED***`
- **Scope**:
    - Arguments (Input): Always scanned if policy enabled.
    - Response (Output): Optional (future scope).
