# MCP-RCP-001: Receipt Chain Protocol

**Version**: 0.1.0
**Status**: Draft

## Introduction
MCP-RCP-001 defines the protocol for generating and verifying immutable, cryptographically signed receipts for tool executions.

## 1. Receipt Structure
A receipt MUST contain:
- `header`: Metadata identifying the issuer, tenant, and sequence.
- `content`: The canonical representation of the request and response.
- `proof`: Mathematical evidence of integrity and sequence.

## 2. Hash Chaining
Each receipt MUST include `prev_receipt_hash`.
- The first receipt (Genesis) MUST have `prev_receipt_hash: "000..."`.
- Each subsequent receipt chains to the SHA-256 hash of the *previous* receipt's full payload.

## 3. Signing
Receipts MUST be signed using **Ed25519**.
- The signature MUST cover the `header` and the `content` hash.

## 4. Verification Algorithm
1. Recompute the canonical hash of the content.
2. Verify the Ed25519 signature using the issuer's public key.
3. Validate that `prev_receipt_hash` matches the actual hash of the previous receipt in the audit trail.
