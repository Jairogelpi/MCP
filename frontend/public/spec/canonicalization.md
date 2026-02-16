# Canonicalization Specification (Spec v0.1.0)

## Overview
Canonicalization (C14N) is the process of converting a structured document into a standardized format. In the context of the Receipt Layer, it is critical for ensuring that two people hashing the same "logical" receipt arrive at the exact same "hash" value.

## 1. Core Rules

### A. Key Sorting
- All JSON objects MUST have their keys sorted **lexicographically** (alphabetically by UTF-8 codepoint).
- Sorting is recursive: nested objects must also be sorted.

### B. Whitespace
- The final serialized string MUST NOT contain any unnecessary whitespace.
- No newlines, no spaces after colons, no indentation.
- Example: `{"a":1,"b":2}` instead of `{"a": 1, "b": 2}`.

### C. Numeric Types & Precision
To avoid floating-point representation drift (e.g., `0.3` vs `0.299999999`):
- All currency/monetary values MUST be converted to **Microunits** (integers) if they are being hashed.
- Conversion factor: `1 unit = 1,000,000 microunits`.
- JSON representation: Numbers MUST be serialized as **strings** if they are large or require precision, but for this spec, **plain JSON integers** are preferred for microunits.
- *Fields affected*: `economic.cost_settled` (stored as microunits in the hash-input).

### D. Arrays
- Arrays must maintain their original order.
- Each element in the array must be canonicalized if it is a complex type.

### E. Date/Time
- All timestamps MUST use **ISO 8601** format in UTC with `Z` suffix.
- Precision: Milliseconds (e.g., `2026-02-13T00:00:00.000Z`).

## 2. Excluded Fields
When creating the signature or calculating the `receipt_id` (if based on hash):
- The `signature` block ITSELF is excluded from the hash input.
- All other fields defined in `spec/request_contract.md` are included.

## 3. Serialization Algorithm (Pseudo-code)
```typescript
function canonicalize(obj: any): string {
    if (Array.isArray(obj)) {
        return "[" + obj.map(canonicalize).join(",") + "]";
    }
    if (typeof obj === "object" && obj !== null) {
        const sortedKeys = Object.keys(obj).sort();
        const pairs = sortedKeys.map(key => {
            return JSON.stringify(key) + ":" + canonicalize(obj[key]);
        });
        return "{" + pairs.join(",") + "}";
    }
    // Convert Floats to Microunits for specific fields if necessary
    // Otherwise use standard JSON serialization for primitives
    return JSON.stringify(obj);
}
```

## 4. Encoding
- The final canonical string MUST be encoded as **UTF-8**.

---
**Freeze Gate**: `canonicalization-v0.1.0`
