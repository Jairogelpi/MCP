#!/bin/bash
# Onboard Tenant Script
# Usage: ./onboard_tenant.sh <tenant_name> <initial_budget>

TENANT=$1
BUDGET=${2:-1000}

if [ -z "$TENANT" ]; then
    echo "Usage: $0 <tenant_name> [initial_budget]"
    exit 1
fi

echo "📦 Onboarding Tenant: $TENANT"

# 1. Generate Ed25519 Keys
echo "   🔑 Generating Keys..."
# In a real env, we'd use the gen_keys tool, for now simulate:
KEY_ID="key_${TENANT}_$(date +%s)"
echo "{\"key_id\": \"$KEY_ID\", \"status\": \"ACTIVE\"}" > "keys/$TENANT.json"

# 2. Initialize DB Entry (via CLI tool)
echo "   🗄️ Initializing Account & Budgets ($BUDGET EUR)..."
npx tsx admin/budget_seed.ts "$TENANT" "$BUDGET"

# 3. Create Default Policy
echo "   🛡️ Assigning Standard ABAC Ruleset..."
mkdir -p "policies/tenant/$TENANT"
cp policies/tenant/default/ruleset_v1.json "policies/tenant/$TENANT/ruleset_v1.json"

echo "✅ Tenant $TENANT is ready."
echo "   URL: http://localhost:3000/mcp/action"
echo "   Tenant-ID: $TENANT"
