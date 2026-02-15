# High Availability (HA) Posture - MCP Gateway

## Topology
The MCP Gateway is designed to run as a stateless service (aside from the SQLite ledger which requires specific handling).

### 1. Multi-Replica Gateway
- **Approach**: Run 2+ instances of the Gateway behind a Load Balancer.
- **State**: Each instance reads from the same Shared Volume for `mcp_gateway.db` (if using WAL mode) or a replicated database.
- **Failover**: If one replica fails, the Load Balancer directs traffic to the healthy replica.

### 2. Database Reliability (SQLite)
- **WAL Mode**: Enabled to allow multiple readers and one writer without blocking.
- **Fail-Open Mode**: If the DB is completely locked or unavailable, instances fall back to `FAIL-OPEN` to allow traffic flow.

### 3. Upstream Reliability
- **Retries**: Exponential backoff (100ms -> 200ms -> 400ms) for 5xx and 429 errors.
- **Circuit Breaker**: Trips after 5 consecutive failures. Opens for 30 seconds to allow the upstream to recover.
- **Timeouts**: Global 30s timeout for upstream tool calls.

## Failover Verification
1. `docker stop gateway-1`
2. Verify `LB` redirects to `gateway-2`.
3. Check `mcp_requests_total` is still incrementing.
