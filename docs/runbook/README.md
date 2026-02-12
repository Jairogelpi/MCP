# Runbook: mcp_financiero (Phase 1)

## Requisitos Previos
- Docker & Docker Compose
- Node.js 20+ (opcional, para desarrollo local fuera de docker)

## Iniciar el Sistema (Golden Path)

Para levantar el entorno completo (Gateway):

```bash
docker compose up --build
```

El servicio estará disponible en `http://localhost:3000`.

## Ejecutar Tests de Contrato

Los tests de contrato validan que la implementación cumpla con los specs congelados.

1. Asegúrate que el sistema esté corriendo (`docker compose up`).
2. En otra terminal, ejecuta:

```bash
# Asumiendo que tienes node instalado localmente para correr los scripts de prueba
cd tests/contract
npm install
npm test
```

## Estructura del Proyecto

- `spec/`: Contratos inmutables (ActionEnvelope, API).
- `gateway/`: Implementación del servidor (Reverse Proxy).
- `tests/contract/`: Tests de caja negra contra el Gateway.
