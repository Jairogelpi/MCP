# Demo Playbook (15 Minutes)

## Setup (2 min)
1. "Here we have a fresh installation of MCP Gateway."
2. Show `docker ps` (Gateway, DB, OTEL).
3. "We will provision a new tenant 'Acme Corp' with a $50 budget." (Run `provision_tenant.ts`).

## The Problem (3 min)
1. "Without the gateway, an agent can loop and spend $1000s."
2. Run a script simulating a rogue agent hitting an expensive tool.
3. "See? No control."

## The Solution (5 min)
1. "Now, through the Gateway."
2. Run the same script pointing to Gateway port `3000`.
3. **Show Block**: "Request 6 blocked: Budget Exceeded."
4. Show the **Receipt**: "Here is the cryptographically signed proof of the attempt and the block."

## The value (5 min)
1. Open Grafana Dashboard.
2. Show real-time cost tracking, error rates, and the audit log trail.
3. "This is full visibility and control for your AI workforce."
