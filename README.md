# MCP Financiero: Gateway Empresarial (v1.0.0)

> **"El Gateway de Grado Bancario para el Model Context Protocol"**

Este no es un prototipo. Es una implementación real, endurecida para producción y lista para auditoría, diseñada para instituciones financieras y empresas que despliegan Agentes MCP en el mundo real.

## 🚀 ¿Listo para la Vida Real? **SÍ.**

A diferencia de los SDK de MCP estándar, este Gateway proporciona la "Capa Faltante" requerida para una operación serie:

### 1. 🛡️ Gobernanza Soberana (Zero-Heuristics)
- **El Sandbox Soberano**: Seguridad Determinista de Estado. Elimina todas las heurísticas e IA. Valida atómicamente cada transición de estado (ej. cambios en el saldo) antes de que la transacción se consume.
- **La Jaula de Hierro**: Cumplimiento de Invariantes de Negocio y Jaula de Capacidades matemáticas.
- **Libro Mayor Inmutable**: Cada acción es verificada contra leyes físicas de contabilidad financiera.

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

- [Guía del Usuario Final (Instalación y Configuración)](GUIA_USUARIO_FINAL.md)
- [Integración Universal (API, Cloud y SaaS)](GUIA_INTEGRACION_UNIVERSAL.md)
- [Análisis Técnico de la Arquitectura](DOCUMENTACION_TECNICA.md)
- [Guía de Inicio Rápido (Gateway)](gateway/README.md)

---
*Construido con ❤️ para el ecosistema MCP.*
