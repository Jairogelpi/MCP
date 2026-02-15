# Compatibility Policy

## 1. Breaking Changes
A change is **breaking** if it:
1. Removes or renames an existing API field.
2. Changes the type of an existing field.
3. Makes an optional field required.
4. Changes the semantic meaning of a field.

**Policy**: Breaking changes REQUIRE a Major Version bump (Sequence 1.x -> 2.x).

## 2. Non-Breaking Changes
A change is **non-breaking** if it:
1. Adds a new optional field.
2. Adds a new API endpoint.
3. Relaxing a validation constraint.

**Policy**: Non-breaking changes are allowed in Minor updates (1.1 -> 1.2).

## 3. Forward Compatibility
Clients and Servers **MUST** ignore unknown fields in JSON payloads to ensure they can interoperate with newer versions of the peer.
