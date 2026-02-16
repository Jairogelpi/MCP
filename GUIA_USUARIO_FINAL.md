# Guía del Usuario Final: Cómo Usar y Configurar MCP Financiero

Este sistema actúa como una capa de control inteligente entre tus aplicaciones de IA (como Claude Desktop) y tus herramientas financieras o de datos sensibles.

## Modos de Operación

Existen dos formas principales de integrar este sistema en tu flujo de trabajo:

---

### 1. Integración con Claude Desktop (Modo Individual)

Este es el modo ideal para usuarios que quieren usar Claude con la tranquilidad de que la IA no cometerá errores financieros costosos.

#### **Pasos para la configuración:**

1. **Localizar el archivo de configuración**:
   En Windows, abre la carpeta `%APPDATA%\Claude\` y busca el archivo `claude_desktop_config.json`.

2. **Editar la configuración**:
   Añade el "Bridge" de MCP Financiero a la lista de `mcpServers`. Asegúrate de cambiar `C:/ruta/al/proyecto` por la ruta real en tu ordenador:

```json
{
  "mcpServers": {
    "mcp-financiero-seguro": {
      "command": "npx",
      "args": ["tsx", "C:/ruta/al/proyecto/gateway/src/bin/mcp_bridge.ts"],
      "env": {
        "GATEWAY_URL": "http://localhost:3000",
        "MCP_API_KEY": "demo-key",
        "MCP_TENANT_ID": "demo-client",
        "MCP_TARGET_SERVER": "finance-core"
      }
    }
  }
}
```

3. **Reiniciar Claude Desktop**:
   Cierra y abre de nuevo la aplicación. Ahora verás herramientas como `transfer` o `get_balance` disponibles, pero con la protección del Gateway activada.

---

### 2. Modo Proxy Centralizado (Modo Empresa)

Para organizaciones que quieren centralizar el control de costos y seguridad de todos sus agentes de IA.

#### **Pasos para la configuración:**

1. **Despliegue Central**:
   El Gateway se despliega en un servidor centralizado (utilizando Docker).

2. **Gestión de Presupuestos**:
   El administrador de la empresa crea "tenants" (inquilinos) y les asigna límites de gasto:
   ```bash
   # Ejemplo: Crear tenant para el equipo de finanzas con 500€ de crédito
   npx tsx src/admin/provision_tenant.ts --name "Finanzas" --budget 500
   ```

3. **Uso en Aplicaciones Propias**:
   Tus desarrolladores pueden usar el SDK para llamar a cualquier herramienta a través del Gateway, sabiendo que las políticas de seguridad y economía se aplicarán automáticamente.

---

## ¿Qué beneficios obtienes?

- **Control de Gasto Real**: La IA no puede gastar más de lo que tú hayas pre-aprobado en el presupuesto.
- **Auditoría Permanente**: Cada acción genera un recibo criptográfico que puedes consultar en cualquier momento para verificar qué hizo la IA y por qué.
- **Protección contra Alucinaciones**: Si la IA "alucina" e intenta transferir dinero a una cuenta no autorizada, el sistema de políticas (`ABAC`) bloqueará la transacción antes de que salga del Gateway.

---
*Para ayuda técnica adicional, consulta la [Documentación Técnica](DOCUMENTACION_TECNICA.md).*
