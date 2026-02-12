# Standard Error Codes (v0.1.0)

Lista definitiva de códigos de error emitidos por el proxy `mcp_financiero`.

## Seguridad y Acceso

- **`AUTH_MISSING`**: No se proporcionó header de autorización.
- **`AUTH_INVALID`**: El token o API key proporcionado ha caducado o es incorrecto.
- **`POLICY_DENY`**: La acción fue bloqueada por una regla de negocio o seguridad explícita.
- **`APPROVAL_REQUIRED`**: La acción requiere aprobación humana (HITL) y no puede ejecutarse síncronamente (Future).

## Economía

- **`BUDGET_EXCEEDED`**: El tenant o usuario no tiene suficiente cuota/saldo para ejecutar esta acción.
- **`RESERVATION_FAILED`**: Error técnico al intentar bloquear fondos.

## Validación y Formato

- **`INVALID_FORMAT`**: El JSON body no es válido o faltan campos obligatorios.
- **`SCHEMA_MISMATCH`**: Los parámetros no coinciden con la firma de la herramienta solicitada.

## Sistema y Upstream

- **`UPSTREAM_ERROR`**: El servidor MCP destino devolvió un error o no respondió.
- **`INTERNAL_ERROR`**: Error no controlado dentro del proxy.
