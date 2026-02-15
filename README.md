# MCP Financiero: Gateway Empresarial (v1.0.0)

> **"El Gateway de Grado Bancario para el Model Context Protocol"**

Este no es un prototipo. Es una implementación real, endurecida para producción y lista para auditoría, diseñada para instituciones financieras y empresas que despliegan Agentes MCP en el mundo real.

## 🚀 ¿Listo para la Vida Real? **SÍ.**

A diferencia de los SDK de MCP estándar, este Gateway proporciona la "Capa Faltante" requerida para una operación serie:

### 1. 🛡️ Seguridad y Gobernanza
- **RBAC e IAM**: Claves de API granulares con permisos específicos (Admin vs Visor).
- **Anti-Fraude**: Motor de detección heurística para bloquear prompts o herramientas maliciosas.
- **Verificación**: `RevocationManager` aplica políticas de editores y bloquea paquetes prohibidos.

### 2. 💰 Rieles Financieros (Dinero Real)
- **Motor de Liquidación**: Agrega el uso y calcula los pagos para los desarrolladores de Agentes.
- **Libro Mayor de Doble Entrada**: Contabilidad compatible con ACID con operaciones de reserva (`reserve()`).
- **Blockchain de Recibos**: Encadenamiento inmutable de cada transacción mediante hashes SHA-256.

### 3. 👁️ Observabilidad y Cumplimiento
- **Logs de Auditoría**: Registro inmutable de cada llamada a herramientas y acceso a datos.
- **OpenTelemetry**: Trazabilidad completa desde el Edge hasta la Base de Datos.
- **Integración KYC**: Ganchos de verificación de identidad antes de liberar pagos.

### 4. 🧱 Infraestructura
- **Activo-Activo**: Diseñado para conmutación por error multi-región.
- **Agnóstico a la BD**: Funciona en **Postgres** (Producción) o **SQLite** (Desarrollo).
- **Dockerizado**: Despliegue con un solo comando mediante `docker-compose.prod.yaml`.

---

## 📖 Documentación Detallada (En Español)

- [Análisis Técnico de la Arquitectura](DOCUMENTACION_TECNICA.md)
- [Guía de Inicio Rápido (Gateway)](gateway/README.md)

---
*Construido con ❤️ para el ecosistema MCP.*
