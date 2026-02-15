# The "Verified Receipt" Badge Program

The "Verified Receipt" badge signifies that an MCP Gateway implementation adheres strictly to the MCP-RCP-001 protocol and MEP-001 economic extensions.

## Requirements for Compliance
1. **Immutable Chaining**: Every receipt MUST be linked to the previous one via SHA-256.
2. **Deterministic Canonicalization**: The content hash MUST be computed using the WYSINWYS algorithm (Stable JSON stringify).
3. **Open Verification**: The implementation MUST provide the Public Key (Ed25519) in the `public_key` field of the receipt proof.
4. **Standard Errors**: MUST use the error codes defined in `error_codes.md`.

## Conformance Testing
To obtain the badge, an implementation MUST pass the verification test against the `conformance_suite/` using the official `verify` tool.
