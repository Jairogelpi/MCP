# Deploying MCP Gateway with Helm

This chart deploys the MCP Gateway along with the LGTM (Grafana, Loki, Tempo, Prometheus) observability stack.

## Prerequisites
- Kubernetes cluster
- Helm v3+
- Persistence enabled for SQLite (PVC)

## Installation
```bash
helm install mcp-gateway ./deploy/helm
```

## Configuration
| Parameter | Description | Default |
|---|---|---|
| `replicaCount` | Number of gateway pods | 2 |
| `ledger.failMode` | `open` or `closed` | `closed` |
| `otel.enabled` | Enable tracing/metrics | `true` |

## Scaling
The gateway is stateless. Horizontal Pod Autoscaler (HPA) can be used to scale based on CPU/Memory or custom Prometheus metrics.
