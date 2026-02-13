# Response Normalization (Spec v0.1.0)

## Overview
Upstream responses contain volatile metadata (latency, provider-specific timestamps, headers) that prevent consistent hashing. This spec defines how to strip that noise to produce a deterministic "unit of result".

## 1. Success Response
A success must be normalized to:

```json
{
  "status": "success",
  "result": {
    "content": [], 
    "isError": false
  },
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

### Normalization Rules:
- **Exclude**: `upstreamLatency`, `headers`, `isStream`, `stream` object references.
- **Include**: The core `result` or `content` array returned by the tool.
- **Include**: The `usage` report (used for billing audit).
- **Sorting**: Keys must be sorted (Canonicalization).

## 2. Error Response
An error must be normalized to:

```json
{
  "status": "error",
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message"
  }
}
```

### Normalization Rules:
- **Exclude**: Stack traces, internal paths, or original exception objects.
- **Include**: The standard `ReceiptError` components.

## 3. Determinism
If the upstream provider returns an object with unsorted keys, the normalization layer MUST sort them before passing the object to the Canonicalizer.

---
**Freeze Gate**: `hashing-v0.1.0`
