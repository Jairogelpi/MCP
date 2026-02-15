# MEP-0004: Receipt Canonicalization

| Metadata | Value |
| :--- | :--- |
| **Title** | Receipt Canonicalization (JCS) |
| **Author** | Architecture Team |
| **Status** | Active |

## 1. Motivation
Deterministic signature verification requires a canonical JSON representation.

## 2. Specification Changes
- Systems MUST use **RFC 8785 (JCS)** for canonicalizing receipt JSON before hashing/signing.
- **Sort Keys**: Lexicographical order.
- **Whitespace**: No whitespace between keys/values.

## 3. Compatibility Impact
Ensures signatures generated in Python match those verified in Node.js/Go.

## 4. Security Considerations
Prevents semantic ambiguous attacks on JSON parsing.
