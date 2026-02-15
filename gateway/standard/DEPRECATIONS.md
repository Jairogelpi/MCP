# Deprecation Policy

## 1. Lifecycle
1.  **Active**: Feature is fully supported.
2.  **Deprecated**: Feature is marked for removal. Logs/Headers emit warnings.
3.  **Removed**: Feature is gone.

## 2. Timeline
- **Notification**: Deprecation must be announced at least one Minor version before removal.
- **Duration**: A deprecated feature must be supported for at least **2 Minor Releases** or **6 Months** (whichever is longer) before removal.

## 3. Communication
- **Headers**: HTTP response must include `X-MCP-Deprecation: <warning>`.
- **Logs**: Gateway must log a WARN level message when a deprecated feature is used.
- **Docs**: Documentation must clearly flag the feature as "[DEPRECATED]".
