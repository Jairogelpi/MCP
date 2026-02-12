# ActionEnvelope Specification (v0.1.0)

El `ActionEnvelope` es la **unidad atómica** de información que fluye a través del pipeline de interceptores.

## Campos Principales

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único de traza para esta ejecución. |
| `version` | SemVer | Versión del schema del envelope (actual: `0.1.0`). |
| `type` | Enum | `command` (acciones con efectos secundarios) o `query` (lectura). |
| `action` | String | Nombre de la herramienta o recurso invocado (ej. `transfer_funds`). |
| `parameters` | Object | Argumentos brutos enviados por el cliente. |
| `meta` | Object | Metadatos de contexto, seguridad y enrutamiento. |

## Meta Context (Campos obligatorios)

Todo envelope DEBE contener en `meta`:

- `timestamp`: Cuándo entró al proxy.
- `tenant`: El ID del tenant (extraído de la URL `/mcp/{tenant}/...`).
- `targetServer`: El servidor MCP destino (extraído de URL).
- `authContext`: Datos de identidad validados (si Auth pasó).

## Ciclo de Vida

1. **Ingesta**: El payload HTTP/SSE crudo se convierte a este formato en el paso `Normalize`.
2. **Enriquecimiento**: Interceptores posteriores pueden añadir datos a `meta` (ej. `riskScore`).
3. **Consumo**: El paso `Policy` lee este objeto para decidir `ALLOW/DENY`.
4. **Ejecución**: El paso `Forward` usa `action` y `parameters` para llamar al upstream.
