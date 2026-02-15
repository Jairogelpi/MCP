# FAQ

## General
**Q: Is this a replacement for LangChain/LlamaIndex?**
A: No, it adheres to the MCP Standard. It sits *between* your agent (LangChain) and the Tools/LLMs to provide control and auditability.

**Q: Do I need to modify my agent code?**
A: No. Just point your MCP client to the Gateway URL instead of the direct Tool Server URL.

## Financial
**Q: How does budgeting work?**
A: You set a budget (e.g., $50/mo EUR) for a Tenant or Agent. The Gateway estimates cost *before* the call. If `Projected Spend + Current Spend > Budget`, the call is blocked.

**Q: Are the receipts legally binding?**
A: They are cryptographically non-repudiable proofs that a request was made and executed. They are designed to support legal and financial settlement.

## Operations
**Q: Can I run this on-prem?**
A: Yes, it is a Docker container. You can run it air-gapped.
