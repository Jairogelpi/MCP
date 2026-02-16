# Proxy API Contract (v0.1.0)

## Overview
The Gateway listens on `0.0.0.0:3000` and exposes a unified entry point for all MCP tool invocations.

## Route

### `POST /mcp/:tenant/:upstream`

Invokes a specific tool on a specific upstream server context.

- **URL Params**:
  - `tenant`: The Organization ID (e.g., `demo-client`).
  - `upstream`: The logical name of the upstream server (e.g., `finance-core`).

- **Headers**:
  - `Authorization`: `Bearer <jwt_token>` OR `x-api-key: <api_key>`
  - `Content-Type`: `application/json`

- **Body (JSON-RPC 2.0 style)**:
  ```json
  {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "transfer_funds",
      "arguments": {
        "from": "A1",
        "to": "B2",
        "amount": 100
      }
    },
    "id": "123"
  }
  ```

## Authentication
The gateway accepts two forms of authentication, normalized into `PipelineContext.identity`:

1.  **API Key**:
    -   Header: `x-api-key`
    -   Validated against `iam_keys` table.
2.  **JWT (User Session)**:
    -   Header: `Authorization: Bearer <token>`
    -   Validated via `AuthService`.

## Response Format

### Success (200 OK)
Standard JSON-RPC 2.0 result, potentially decorated with receipt data.

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Transfer successful."
      }
    ]
  }
}
```

### Error (4xx/5xx)
See [error_codes.md](./error_codes.md) for standardized error objects.
