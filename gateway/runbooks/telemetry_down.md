# Runbook: Telemetry Infrastructure Down

**Severity**: MEDIUM
**Status**: OTel Collector, Prometheus, or Grafana is unreachable.

## Impact
- Loss of visibility.
- Alerting system is blind.

## Diagnostic Steps
1. **Check Docker Container**: `docker ps` to ensure `otel-collector` and `prometheus` are running.
2. **Check Collector Logs**: `docker logs otel-collector` to see if it's failing to export to Tempo/Loki.
3. **Verify Gateway Link**: Check gateway start logs for `Telemetry initialization failed`.

## Recovery Steps
1. **Restart Stack**:
   ```bash
   docker-compose -f deploy/observability-stack/docker-compose.yaml restart
   ```
2. **Purge Volatile Data**: If Loki/Tempo storage is full, clear the `/data` volumes.
3. **Fallback Logging**: Rely on standard gateway console output until infrastructure is restored.
