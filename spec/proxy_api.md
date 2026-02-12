# Proxy API Specification (v0.1.0)

## Rutas

El proxy expone una estructura de rutas jerárquica para soportar multi-tenancy y múltiples servidores upstream.

### POST `/mcp/:tenant/:server`

Ejecuta una acción (Tool o Prompt) contra un servidor MCP específico.

- **URL Params**:
  - `:tenant`: Identificador del cliente/organización (ej. `acme-corp`).
  - `:server`: Identificador del servidor MCP upstream (ej. `financial-core`).

- **Headers**:
  - `Authorization`: `Bearer <token>` (Requerido)
  - `Content-Type`: `application/json`

- **Body**:
  ```json
  {
    "type": "command", // o "query"
    "action": "get_balance",
    "parameters": { "accountId": "123" }
  }
  ```

## Autenticación

Para el MVP, se utilizará un esquema simple de API Key o JWT simulado.
El header `Authorization` es obligatorio.

## Respuestas y Errores

El proxy intercepta errores del pipeline y devuelve códigos de estado HTTP y códigos de error internos estandarizados.

| Escenario | HTTP Status | Error Code (Internal) | Descripción |
|---|---|---|---|
| Éxito | 200 OK | - | La acción se ejecutó y retornó resultado. |
| Auth Fallida | 401 Unauthorized | `AUTH_MISSING` / `AUTH_INVALID` | No se envió token o es inválido. |
| Bloqueo por Política | 403 Forbidden | `POLICY_DENY` | El interceptor de políticas rechazó la acción. |
| Presupuesto Excedido | 402 Payment Required | `BUDGET_EXCEEDED` | El interceptor económico no pudo reservar fondos. |
| Validación Fallida | 400 Bad Request | `INVALID_FORMAT` | El payload no cumple con el schema. |
| Error Upstream | 502 Bad Gateway | `UPSTREAM_ERROR` | El servidor MCP upstream falló. |

### Formato de Error

```json
{
  "error": {
    "code": "POLICY_DENY",
    "message": "Action 'transfer' is not allowed for this user role.",
    "requestId": "uuid..."
  }
}
```
