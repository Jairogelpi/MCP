# Secrets Handling Policy

## 1. Key Types
| Key | Storage | Rotation |
|-----|---------|----------|
| **DB Master Key** | Environment Variable (Docker Secret) | 90 days |
| **API Key Hashes** | SQLite (`iam_keys`) | Triggered by user |
| **Ed25519 Signing Key** | File System (Encrypted) / Vault | Yearly |

## 2. Implementation Rules
- **No Plaintext**: Secrets must be hashed (Argon2/SHA256) or encrypted at rest.
- **Zero Logging**: Interceptors must sanitize `Authorization` and `secret` fields before logging.
- **Secure Provisioning**: Keys are returned ONCE to the client upon creation.

## 3. Emergency Procedures
- **Global Revocation**: Flag in `iam_keys` can disable all keys for a tenant instantly.
- **Key Compromise**: Rotate parent key; children keys are invalidated immediately.
