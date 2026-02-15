# How to Verify an MCP Receipt

Users can verify the integrity of any tool execution by auditing the receipt provided by the MCP Gateway.

## Prerequisites
- **Public Key**: The gateway's Ed25519 public key (usually provided in the receipt or via `/public-key`).
- **Audit Tool**: The `verified-verify` CLI tool.

## Verification Steps
1. **Save the Receipt**: Export the receipt JSON from your client or gateway.
2. **Run the Audit**:
   ```bash
   npx mcp-gateway verify ./receipt.json
   ```

## What the Tool Checks
1. **Signature**: Validates that the receipt was actually signed by the gateway's private key.
2. **Payload Integrity**: confirms the request/response content matches the signed hash.
3. **Chain Sequence**: Verifies that the receipt correctly links to the previous hash in the tenant's history.
