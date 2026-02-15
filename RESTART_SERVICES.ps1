Write-Host "🛑 Deteniendo procesos Node.js antiguos..."
Stop-Process -Name "node" -ErrorAction SilentlyContinue

Write-Host "⏳ Esperando 2 segundos..."
Start-Sleep -Seconds 2

Write-Host "🚀 Iniciando Upstream Server (Finance Core)..."
$upstream = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\jairo\Desktop\mcp_financiero\gateway; npx tsx examples/mcp_server.ts" -PassThru

Write-Host "⏳ Esperando 5 segundos para que el Upstream esté listo..."
Start-Sleep -Seconds 5

Write-Host "🚀 Iniciando MCP Gateway..."
# Usamos npx tsx directamente para evitar el error de 'dist/server.js' no encontrado
$gateway = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\jairo\Desktop\mcp_financiero\gateway; npx tsx src/server.ts" -PassThru

Write-Host "✅ ¡Todo reiniciado en el orden correcto!"
Write-Host "👉 Ahora prueba en Claude: 'Transfer 10 EUR from A1 to A2'"
