# Competitive Landscape: MCP Financial Gateway

## 1. vs. Portkey / Helicone / LangFuse
| Feature | MCP Financial Gateway | Observability Proxies |
| :--- | :--- | :--- |
| **Primary Focus** | **Action Control & Settlement** | Tracing & Debugging |
| **Ledger** | **ACID, Double-Entry** | N/A (Log-based cost est.) |
| **Budgeting** | **Hard Stops (Pre-flight)** | Async Alerts (Post-facto) |
| **Audit** | **Signed Receipts (Ed25519)** | Plain Logs |
| **Standard** | **MEP-001 (Universal)** | Proprietary SDKs |

## 2. vs. Custom In-House Wrappers
- **Maintenance**: We handle the 100+ integrations and updates.
- **Security**: Hardened against SSRF, Replay, and Prompt Injection (via limits).
- **Compliance**: SOC2/GDPR ready out of the box.

## 3. Positioning
"The Swift Network for AI Agents." We are not just logging calls; we are **settling** them.
