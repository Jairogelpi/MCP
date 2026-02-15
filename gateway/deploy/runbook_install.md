# MCP Gateway Installation Runbook (Production)

This guide walks you through deploying the MCP Gateway in a production-ready posture using Docker.

## 1. Prerequisites
- Docker & Docker Compose installed.
- Outbound network access for MCP tool servers.
- Ports `3000` (Gateway) and `3001` (Grafana) available.

## 2. Installation Steps

### Step 1: Clone and Configure
```bash
git clone <repo-url>
cd mcp_gateway/gateway
cp deploy/env.example .env
# Edit .env to set your secrets and database strings
```

### Step 2: One-Command Start
```bash
docker compose -f deploy/docker-compose.prod.yaml up -d
```

### Step 3: Verify Deployment
Run a health check against the gateway:
```bash
curl http://localhost:3000/health
```

## 3. Post-Install Checklist
1. **Onboard Administrative Tenant**: Run the `provision_tenant` script for your main app.
2. **Setup SSL**: It is highly recommended to put an Nginx/Caddy proxy in front with TLS.
3. **Configure Grafana**: Access `http://localhost:3001` and import the dashboard from `dashboards/mcp_gateway.json`.

---
**Standard Release**: `deploy-v0.1.0`
