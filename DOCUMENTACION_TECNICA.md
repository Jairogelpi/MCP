# Análisis Técnico de la Arquitectura: Rieles Financieros para IA

Este documento detalla la implementación técnica del Gateway MCP, validando que no es "vaporware", sino una arquitectura funcional de grado empresarial.

## 1. La Prueba de Inmutabilidad (`chain.ts`)

El sistema implementa una cadena de recibos criptográficos que diferencia esta plataforma de una simple API.

- **Bloqueo Optimista**: La función `processReceipt` se ejecuta dentro de una `db.raw.transaction` serializada. Esto garantiza que la integridad de la cadena se mantenga incluso bajo alta concurrencia.
- **Enlace Matemático ($H_n$)**: Cada recibo recupera el `last_hash` de la base de datos y lo inserta en su propio cuerpo como `prev_receipt_hash`.
- **Canonicalización**: Antes de firmar, el JSON se limpia y normaliza. Esto evita que cambios triviales en el formato (como espacios) rompan la verificación criptográfica.
- **Huella Digital**: Se utiliza `SHA-256` para crear un hash inmutable de cada operación.

## 2. El Cerebro de Decisiones (`decider.ts`)

Demuestra la separación crítica entre la **Intención** (lo que el Agente pide) y la **Autorización** (lo que el Gateway permite).

- **Jerarquía de Evaluación**:
    1. **Estimación**: ¿Cuál es el costo proyectado?
    2. **Rate Limit**: ¿Se está excediendo la frecuencia permitida?
    3. **Presupuesto**: ¿Hay fondos suficientes en el Ledger?
- **Lógica de Degradación**: Implementación de "límites blandos" (`SOFT_LIMIT`). Si el presupuesto es escaso, el sistema puede degradar automáticamente a un modelo más económico sin interrumpir el servicio.

## 3. Rendimiento y Resiliencia (`server.ts` y `pipeline.ts`)

Optimizado para una latencia extremadamente baja (~165ms) manteniendo máxima seguridad.

- **Pipeline de Interceptores**: El `PipelineRunner` pasa el contexto (`stepResults`) de forma eficiente entre fases (seguridad, economía, ejecución, liquidación).
- **Patrón Saga (Rollback Automático)**: Si una operación falla después de reservar fondos, el sistema ejecuta automáticamente `ledger.void()`. Esto garantiza que nunca se cobre por una operación fallida.

## 4. Gobernanza Soberana (Zero-Heuristics)

El sistema ha evolucionado de un modelo de "detección" a uno de "atrapamiento determinista".

- **El Sandbox Soberano (`sovereign_sandbox.ts`)**: Implementa la validación de estados post-ejecución. No intenta adivinar si un prompt es malicioso; en su lugar, verifica que la transición de estado resultante (ej. deltas en el ledger) cumpla con todas las leyes del sistema antes de permitir el commit final.
- **La Jaula de Hierro (`iron_cage.ts`)**: Actúa como un interceptor dual que aplica leyes de pre-condición (Invariantes) y supervisa la ejecución en el sandbox.
- **Aislamiento Cero-Confianza**: Se han eliminado por completo el WAF y el Sentinel de IA para garantizar que la seguridad sea puramente matemática y no probabilística, reduciendo la superficie de ataque y la latencia operativa.

## 5. Verificación de Integridad (`verify_concurrency.ts`)

---

## Conclusión

La arquitectura implementa tres pilares fundamentales:
1. **Inmutabilidad**: Vía encadenamiento de hashes.
2. **Determinismo**: Vía gobernanza soberana y sandbox de estado.
3. **Economía**: Vía un motor de decisiones autónomo.

Es una plataforma de grado bancario diseñada para que los agentes de IA operen con capital real bajo leyes físicas de negocio inquebrantables.
