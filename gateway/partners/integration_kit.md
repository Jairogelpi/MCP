# Integration Kit

## 1. Onboarding Checklist
- [ ] Sign CLA (`LICENSES/CLA.md`).
- [ ] Provision Sandbox Tenant via CLI (`npm run admin:provision`).
- [ ] Implement MCP Server compliant with `mcp-transport-http-sse`.

## 2. Technical Requirements
- **Auth**: Must implement Bearer auth using issued API Keys.
- **Audit**: Must propagate `X-Trace-Id` headers.
- **Schema**: Must validate all tool arguments against JSON Schema.

## 3. Conformance
Run the suite against your integration:
```bash
npx mcp-conformance --url https://your-adapter.com/mcp --key $KEY
```
Submit the `conformance_report.json` for certification.
