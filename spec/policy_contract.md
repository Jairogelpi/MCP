# Policy Contract Specification
**Version**: v0.1.0
**Status**: DRAFT

## 1. Contexto
Este documento define el contrato estricto de entrada y salida del **Policy Decision Point (PDP)**.
El **PEP (Interceptor)** debe conformar el request a este formato de entrada y respetar estrictamente la estructura de salida.

## 2. PDP Inputs (Entrada)
El PEP debe extraer y normalizar la siguiente información del `ActionEnvelope`:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `tenant_id` | string | **Sí** | Identificador del inquilino (e.g. `acme`). |
| `project_id` | string | No | Sub-división o proyecto origen. |
| `agent_id` | string | **Sí** | Identidad del agente invocador (Client ID / User ID). |
| `session_id` | string | No | Identificador de trazabilidad de sesión/conversación. |
| `upstream_server_id` | string | **Sí** | Identificador del servidor MCP destino (e.g. `finance-core`). |
| `mcp_method` | string | **Sí** | Método MCP (e.g. `tools/call`, `resources/read`). |
| `tool_name` | string | **Sí** (si tool) | Nombre de la herramienta invocada (e.g. `get_balance`). |
| `args` | object | **Sí** | Argumentos completos de la llamada. |
| `input_schema_hash` | string | No | Hash SHA256 del esquema de entrada para validación de integridad. |
| `risk_class` | string | No | Clasificación preliminar de riesgo (e.g. `low`, `high`). |
| `timestamp` | number | **Sí** | Timestamp UNIX del evento. |
| `request_id` | string | **Sí** | ID único de la petición (Trace ID). |

## 3. PDP Output (Decisión)
El motor de políticas retornará una estructura **PolicyDecision**:

```typescript
type RuleEffect = 'allow' | 'deny' | 'transform';

interface PolicyDecision {
  decision: RuleEffect;
  reason_codes: string[];      // Lista de códigos de razón (mínimo 1)
  transform_patch?: object;    // RFC 6902 JSON Patch o Partial Merge (solo si transform)
  obligations?: string[];      // Acciones colaterales obligatorias
}
```

### Obligaciones Estándar
- `log_sensitive_event`: Requiere auditoría extendida.
- `require_https`: Fuerza transporte seguro.
- `notify_admin`: Requiere alerta asíncrona.

## 4. Reason Codes Estándar
Códigos inmutables para categorizar decisiones.

| Código | Descripción |
|---|---|
| `FORBIDDEN_TOOL` | La herramienta solicitada no está permitida para este agente/tenant. |
| `BUDGET_HARD_LIMIT` | Presupuesto agotado (ver Economic Engine). |
| `PII_DETECTED` | Se ha detectado Información Personal Identificable en los argumentos. |
| `SSRF_BLOCKED` | Intento de acceso a red privada o no permitida. |
| `ARGS_LIMIT_ENFORCED` | Argumentos exceden límites definidos (length, count, value). |
| `TENANT_SCOPE_VIOLATION` | Intento de acceso a recursos fuera del tenant. |
| `SCHEMA_MISMATCH` | Los argumentos no cumplen con el esquema de la política. |
| `DEFAULT_ALLOW` | Permitido por defecto (sin regla específica de bloqueo). |
| `DEFAULT_DENY` | Bloqueado por defecto (sin regla específica de permiso). |

## 5. Freeze Criteria
- [ ] Implementación del modelo de datos en `src/core/contract.ts`.
- [ ] Tests de contrato validando estos inputs/outputs.
