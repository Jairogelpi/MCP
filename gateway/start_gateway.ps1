$env:GATEWAY_PRIVATE_KEY = Get-Content -Raw ./private.pem
$env:LEDGER_FAIL_MODE = $args[0]
$env:SIMULATE_DB_ERROR = $args[1]
$env:VIRTUAL_TOOLS = "1"
$logFile = $args[2]

npx tsx src/server.ts > $logFile 2>&1
