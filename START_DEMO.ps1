
Write-Host "🚀 Starting MCP Financial Demo Environment..." -ForegroundColor Green

$ScriptPath = $PSScriptRoot
$GatewayPath = Join-Path $ScriptPath "gateway"

# 1. Start Upstream (Bank)
Write-Host "Launching Upstream Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$GatewayPath'; npx tsx examples/mcp_server.ts"

# 2. Start Gateway
Write-Host "Launching Gateway..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$GatewayPath'; npm start"

Write-Host "✅ Backend Services Started!" -ForegroundColor Yellow
Write-Host "👉 Now configure Claude Desktop using the instructions in gateway/DEMO_CLAUDE.md"
