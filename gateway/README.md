# Gateway MCP Enterprise (v1.0.0)

> **"El Gateway de Grado Bancario para el Model Context Protocol"**

Este gateway está diseñado para entornos de alta seguridad donde los agentes de IA necesitan interactuar con sistemas financieros reales de forma auditable e inmutable.

## 🚀 Características Principales

### 1. 🛡️ Seguridad y Gobernanza
- **RBAC e IAM**: Gestión de identidades para diferenciar entre administradores y visores.
- **Detección de Fraude**: Filtros para peticiones maliciosas.

### 2. 💰 Rieles Financieros
- **Libro Mayor (Ledger)**: Contabilidad de doble entrada con cumplimiento ACID.
- **Cadena de Recibos**: Cada ejecución genera un recibo firmado y encadenado criptográficamente.

### 3. 👁️ Observabilidad
- **Trazabilidad Abierta**: Integración nativa con OpenTelemetry.
- **Auditoría**: Logs inmutables de cumplimiento.

## 📦 Arquitectura basada en Adaptadores

Utilizamos una **Arquitectura Hexagonal** para aislar la lógica de negocio de las bases de datos y APIs externas:

```typescript
// No importa si es Stripe, PayPal o un Mock.
// La lógica central permanece inmutable.
const banking = new BankingAdapter(); 
await banking.payout(payeeId, amount);
```

## 👩‍💻 Integración para Desarrolladores

### 1. SDKs Empresariales

#### Node.js
```javascript
import { MCPGatewayClient } from '@mcp-gateway/sdk';

const client = new MCPGatewayClient({ 
    baseUrl: 'https://gateway.acme.com', 
    tenantId: 'my-app',
    apiKey: 'mcp_sk_...'
});

const result = await client.callTool('finance-core', 'get_balance', { account: 'A1' });
console.log(`Recibo: ${result.receiptId}`);
```

### 2. API Raw (HTTP)

```bash
POST /mcp/tools/call HTTP/1.1
Host: gateway.acme.com
x-mcp-tenant-id: my-app
Authorization: Bearer mcp_sk_...

{
  "server_name": "finance-core",
  "tool_name": "get_balance",
  "arguments": { "account": "A1" }
}
```

## 🏁 Inicio Rápido (Producción)

1. **Configurar Entorno**:
   ```bash
   cp deploy/env.example .env
   # Configurar DATABASE_URL
   ```

2. **Ejecutar con Docker**:
   ```bash
   docker-compose -f deploy/docker-compose.prod.yaml up -d
   ```

3. **Provisionar Tenant**:
   ```bash
   npx tsx src/admin/provision_tenant.ts --name "Banco Demo"
   ```

---
*Construido con ❤️ para el ecosistema MCP.*
