# SOC2 Control Mapping: MCP Gateway

## 1. Security (Common Criteria)
| Control ID | Description | Implementation | Evidence Artifact |
|------------|-------------|----------------|-------------------|
| **CC6.1** | Access control for systems and data | IAM Robust (Roles, Permissions, Hashed Keys) | `iam_keys` table |
| **CC6.8** | Protection against unauthorized access (WAF/SSRF) | Egress Transformer, WAF Interceptor | `test_security.ts` logs |
| **CC7.1** | Incident monitoring and alerting | Telemetry & Audit interceptors | `audit_events` table |

## 2. Confidentiality
| Control ID | Description | Implementation | Evidence Artifact |
|------------|-------------|----------------|-------------------|
| **CC6.7** | Encryption of data at rest and in transit | HTTPS Egress, Hashed API Keys | `012_iam_robust.sql` |
| **CC9.1** | Identification of confidential information | PII Detection Interceptor | `pii_detection.ts` |

## 3. Availability
| Control ID | Description | Implementation | Evidence Artifact |
|------------|-------------|----------------|-------------------|
| **CC8.1** | System monitoring for availability | OpenTelemetry metrics & logging | `/metrics` endpoint |
