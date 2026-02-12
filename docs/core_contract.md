# Core Contract: mcp_financiero

## 0.1 Alcance MVP Innegociable

Este documento define lo que es el producto y el flujo estricto de cada request.

### Topología
**Reverse Proxy**
`Cliente -> [mcp_financiero Endpoint] -> Upstream MCP`

### Transport Soportado (MVP)
- **HTTP** (para queries/actions standard)
- **SSE** (Server-Sent Events) para streaming de respuestas.

### Pipeline de Interceptor (Fijo)

El flujo de procesamiento para cada request DEBE seguir estrictamente estos pasos:

1.  **Parse/Validate**:
    - Validar formato de entrada.
    - Rechazar malformed requests inmediatamente.

2.  **Normalize -> ActionEnvelope**:
    - Convertir la request a una estructura interna estándar (`ActionEnvelope`).

3.  **Policy Decision (Allow/Deny/Transform)**:
    - Aplicar reglas de negocio y seguridad.
    - Decidir si se permite el paso, se bloquea o se modifica la request.

4.  **Economic Reservation/Settlement (2-phase)**:
    - Gestión de costes/quota antes de ejecutar.
    - Reservar recursos.

5.  **Forward**:
    - Enviar la request procesada al Upstream MCP.

6.  **Capture Response**:
    - Interceptar la respuesta del Upstream.

7.  **Receipt Emit**:
    - Generar un recibo de la transacción.

8.  **Telemetry Emit**:
    - Emitir métricas y logs de la operación.
