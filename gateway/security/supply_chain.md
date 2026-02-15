# Supply Chain Security (SBOM)

## 1. Dependency Management
- **Locking**: `package-lock.json` is mandatory and audited.
- **Vulnerability Scanning**: `npm audit` integrated into CI/CD.
- **Minimum Dependency Policy**: Avoid "left-pad" style micro-packages. Prefer native Node.js modules (e.g., `crypto` over third-party hashing).

## 2. Build Integrity
- **Reproducible Builds**: All Dockerfiles pin base images to specific digests (SHA256).
- **Artifact Signing**: Final docker images signed with `Cosign` (planned).

## 3. External Tool Integrity
- **Provider Verification**: Upstream MCP servers must provide a signed manifest (Future MEP standard).
- **Egress Pinning**: Pinning to specific IP addresses for sensitive financial upstreams.
