# MCP Compatibility Matrix

## 1. Transport Support
| Transport | Version | Status | Notes |
| :--- | :--- | :--- | :--- |
| **HTTP + SSE** | 1.0 | ✅ Stable | Primary transport. |
| **WebSocket** | Draft | 🚧 Planned | For low-latency bi-directional streams. |

## 2. SDK Support Verification
| SDK Language | Version Tested | Conformance | Run ID |
| :--- | :--- | :--- | :--- |
| **Node.js** | 0.4.1 | ✅ Gold | `run_node_041_8x` |
| **Python** | 0.3.0 | ✅ Gold | `run_py_030_9x` |

## 3. Upstream Capability Profiles
| Capability | Requirement |
| :--- | :--- |
| `resources` | **MUST** support `list`, `read` |
| `tools` | **MUST** support JSON Schema for args |
| `prompts` | **SHOULD** support dynamic arguments |
