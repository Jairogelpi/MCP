# Marketplace Publisher Policy

## 1. Publisher Verification
To publish a package on the MCP Marketplace, an organization must:
1.  **Verify Identity**: Provide DUNS number or Business Registration.
2.  **Enable 2FA**: Mandatory for all publisher account members.
3.  **Sign Code of Conduct**: Agree to no malware, no data exfiltration, no hidden costs.

## 2. Supply Chain Security
- **Signing**: All artifacts must be signed with a registered Key.
- **Reproducible Builds**: Source code links must match binary hashes (where applicable).
- **Dependency Scanning**: `npm audit` or equivalent must be clean (0 High/Critical).

## 3. Review Process
- **Automated**: Static analysis for known malware patterns.
- **Manual**: "Premier" packs require human code review before listing.
