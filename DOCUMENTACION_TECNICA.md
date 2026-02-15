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

## 4. Verificación de Integridad (`verify_concurrency.ts`)

El sistema incluye herramientas para validar su propia robustez.

- **Pruebas de Estrés**: Simulación de 50 peticiones concurrentes con retardos aleatorios para forzar condiciones de carrera.
- **Auditoría Retroactiva**: Scripts que recorren la cadena desde el último hash hasta el bloque génesis para asegurar que la integridad matemática no se ha visto comprometida.

---

## Conclusión

La arquitectura implementa tres pilares fundamentales:
1. **Inmutabilidad**: Vía encadenamiento de hashes.
2. **Seguridad**: Vía interceptores explícitos.
3. **Economía**: Vía un motor de decisiones autónomo.

Es una plataforma diseñada para que los agentes de IA operen con capital real de forma segura y auditable.
