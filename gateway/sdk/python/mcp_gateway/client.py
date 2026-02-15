from dataclasses import dataclass
import httpx
import time
import uuid
import json

@dataclass
class ActionEnvelope:
    id: str
    action: str
    parameters: dict
    meta: dict

class MCPGatewayClient:
    def __init__(self, base_url: str, tenant_id: str, api_key: str = None):
        self.base_url = base_url
        self.tenant_id = tenant_id
        self.api_key = api_key

    async def call_tool(self, target_server: str, action: str, parameters: dict = {}):
        envelope = {
            "id": str(uuid.uuid4()),
            "action": action,
            "parameters": parameters,
            "meta": {
                "tenant_id": self.tenant_id,
                "targetServer": target_server,
                "timestamp": int(time.time() * 1000)
            }
        }
        
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/mcp/action",
                json=envelope,
                headers=headers
            )
            
            if response.status_code != 200:
                error = response.json()
                raise Exception(f"Gateway Error: {error.get('message')} ({error.get('code')})")

            result = response.json()
            receipt_id = response.headers.get("x-mcp-receipt-id")
            
            return {**result, "receipt_id": receipt_id}
