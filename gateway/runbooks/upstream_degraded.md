# Runbook: Upstream Service Degraded

**Severity**: HIGH / MEDIUM
**Status**: High latency or error rates from upstream MCP tools.

## Impact
- Gateway requests time out.
- Increased resource consumption in the gateway (waiting for response).

## Diagnostic Steps
1. **Check Traces**: Identify the specific `upstream.call` span in Tempo (Grafana).
2. **Check Metrics**: Look at `upstream_latency_p99` per `targetServer`.
3. **Verify Upstream Directly**: Attempt to connect to the upstream server bypass the gateway.

## Recovery Steps
1. **Enable Circuit Breaker**: If errors > 50%, the circuit breaker should trip automatically (if implemented in 6.7).
2. **Throttle Tenant**: Use the ABAC ruleset to temporarily deny high-volume tenants hitting that tool.
3. **Scale Upstream**: If the upstream is under-provisioned, add replicas.
