import { IdentityManager } from './identity_manager';

async function verifySecurityHardening() {
    console.log('\n🧪 Suite de Security Regression (Phase 8.3)...');

    const adminSecret = 'admin_secret_123';
    const baseUrl = 'http://localhost:3000/acme/mcp-server';

    // Helper for requests
    const call = async (body: any) => {
        return fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminSecret}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
    };

    // 1. SSRF Probe
    try {
        console.log('   [1] Testing SSRF to Private IP (169.254.169.254)...');
        const res = await call({
            type: 'command',
            action: 'fetch_url', // Assumed tool
            parameters: { url: 'http://169.254.169.254/latest/meta-data/' },
            request_id: `ssrf_${Date.now()}`,
            timestamp: Date.now()
        });
        const data = await res.json() as any;
        if (data.error?.code === 'SSRF_BLOCKED' || res.status === 403) {
            console.log('   ✅ [SUCCESS] SSRF Blocked correctly.');
        } else {
            console.log('   ❌ [FAILURE] SSRF succeeded or was not blocked correctly.', res.status);
        }
    } catch (err: any) {
        console.log('   ℹ️  SSRF rejection error:', err.message);
    }

    // 2. Replay Protection
    try {
        console.log('   [2] Testing Replay Protection...');
        const rid = `replay_${Date.now()}`;
        const ts = Date.now();
        const body = {
            type: 'query',
            action: 'get_status',
            parameters: {},
            request_id: rid,
            timestamp: ts
        };

        // First attempt
        const r1 = await call(body);

        // Second attempt (REPLAY)
        const r2 = await call(body);
        const d2 = await r2.json() as any;

        if (d2.error?.message?.includes('REPLAY') || r2.status === 500 || r2.status === 403) {
            console.log('   ✅ [SUCCESS] Replay Attack Blocked.');
        } else {
            console.log('   ❌ [FAILURE] Replay attempt potentially succeeded.', r2.status);
        }
    } catch (err: any) {
        console.log('   ℹ️  Replay failure detected:', err.message);
    }

    // 3. Rate Limit Flood
    try {
        console.log('   [3] Testing Rate Limit Flood (forcing 25 requests)...');
        const promises = [];
        for (let i = 0; i < 25; i++) {
            promises.push(call({
                type: 'query',
                action: 'get_status',
                parameters: { count: i },
                request_id: `flood_${Date.now()}_${i}`,
                timestamp: Date.now()
            }));
        }
        const results = await Promise.all(promises);
        const throttled = results.some(r => r.status === 429 || r.status === 500);

        if (throttled) {
            console.log('   ✅ [SUCCESS] Rate limit triggered.');
        } else {
            console.log('   ❌ [FAILURE] Rate limit did not trigger for 25 parallel requests.');
        }
    } catch (err: any) {
        console.log('   ℹ️  Flood rejection:', err.message);
    }
}

verifySecurityHardening().catch(console.error);
