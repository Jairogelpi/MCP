# Hashing Specification (Spec v0.1.0)

## Overview
Hashing provides a fixed-size fingerprint of the data. In the Receipt Layer, we use hashes to link the Action Envelope (request) and the result (response) into a single signed document.

## 1. Algorithm
- **Algorithm**: SHA-256
- **Output Format**: Base64 (to be used in the `signature.proof` fields)
- **Library**: `crypto` module in Node.js

## 2. Request Hash (`request_hash`)
The `request_hash` seals the intent of the user.

- **Input**:
    1. Canonicalized `ActionEnvelope` (as per `spec/canonicalization.md`).
    2. `timestamp` (integer or ISO8601 string, must be part of the canonical structure).
    3. `nonce` (a random string to ensure the same request has different hashes if sent twice).
- **Rule**: If the `ActionEnvelope` already contains `timestamp` and `nonce` in its `meta` block (which it should), the hash is calculated directly over the **Canonical JSON** of the entire envelope.

## 3. Response Hash (`response_hash`)
The `response_hash` seals the execution outcome.

- **Input**: The **Normalized Response** (as per `spec/response_normalization.md`).
- **Rule**: Non-deterministic fields (like upstream latency or specific provider timestamps) MUST be stripped or normalized before hashing.

## 4. Integrity Check
A verifier can reproduce these hashes by:
1. Taking the original `ActionEnvelope` from the request.
2. Taking the `result` or `error` from the upstream response.
3. Applying the normalization and canonicalization rules.
4. Comparing the resulting SHA-256 Base64 string with the values in the receipt.

---
**Freeze Gate**: `hashing-v0.1.0`
