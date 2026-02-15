# Package Signing Specification

## 1. Format
We use **Ed25519** signatures over the **SHA-256** hash of the package tarball.

## 2. Manifest (`package.json` extension)
```json
{
  "name": "mcp-finance-pack",
  "version": "1.0.0",
  "mcp_signature": {
    "keyId": "did:mcp:pub:stripe",
    "algorithm": "ed25519",
    "value": "base64_signature_here..."
  }
}
```

## 3. Verification Steps
1.  **Resolve Key**: Look up `keyId` in the Global Registry.
2.  **Verify Trust**: Ensure `keyId` belongs to a "Verified Publisher".
3.  **Verify Sig**: `Ed25519.verify(Hash(Package), Signature, PublicKey)`.
4.  **Check Revocation**: Ensure `keyId` and `PackageID` are not in the CRL.
