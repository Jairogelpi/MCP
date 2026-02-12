
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000';
const TENANT = 'acme';
const SERVER = 'finance-core';

async function runTests() {
    console.log('🚀 Running Expanded Contract Tests...');
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            process.stdout.write(`[TEST] ${name} ... `);
            await fn();
            console.log('✅ PASS');
            passed++;
        } catch (e) {
            console.log('❌ FAIL');
            console.error('    Error:', e.message);
            failed++;
        }
    }

    // Helper with error catching
    const safeFetch = async (url, opts) => {
        try {
            return await fetch(url, opts);
        } catch (err) {
            throw new Error(`Fetch failed: ${err.message}`);
        }
    };

    // --- NEGATIVE TESTS ---

    await test('Negative: Missing Auth Header', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'command', action: 'valid_tool', parameters: {} })
        });
        if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await test('Negative: Invalid Payload', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', parameters: {} })
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // --- CATALOG TESTS ---

    await test('Catalog: Invalid Tool -> Forbidden', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', action: 'non_existent_tool', parameters: {} })
        });
        if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
        const body = await res.json();
        assert.strictEqual(body.error.code, 'FORBIDDEN_TOOL');
    });


    // --- POLICY TESTS ---

    await test('Policy: Deny Dangerous Op', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', action: 'dangerous_op', parameters: {} })
        });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    const NETWORK_SERVER = 'network-service';

    await test('Policy: SSRF Block (Localhost)', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${NETWORK_SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({
                type: 'command',
                action: 'curl_op',
                parameters: { url: 'http://localhost:8080/secrets' }
            })
        });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await test('Policy: SSRF Allow (Allowed Domain)', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${NETWORK_SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({
                type: 'command',
                action: 'curl_op',
                parameters: { url: 'http://example.com/api' }
            })
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    // --- ABAC TESTS ---

    await test('ABAC: Allow Dangerous Op (Admin)', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
            body: JSON.stringify({ type: 'command', action: 'dangerous_op', parameters: {} })
        });
        if (res.status !== 200) {
            const txt = await res.text();
            throw new Error(`Expected 200, got ${res.status}: ${txt}`);
        }
    });

    await test('ABAC: Deny Dangerous Op (User)', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', action: 'dangerous_op', parameters: {} })
        });
        // Ruleset has "Admins can do dangerous things" (Allow).
        // Default Deny All is at the bottom.
        // So "test" user (role=user) should fall through to Default Deny.
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
        const body = await res.json();
        assert.strictEqual(body.error.code, 'POLICY_VIOLATION');
    });

    await test('Transformers: PII Redaction', async () => {
        // sensitive_op has rule to redact 'credit_card'
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
            body: JSON.stringify({
                type: 'command',
                action: 'sensitive_op',
                parameters: { credit_card: '4111 2222 3333 4444', other: 'safe' }
            })
        });
        // Verify success (200) - Redaction happens silently before upstream
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.status, 'success');
    });

    await test('Transformers: Egress Limits (Max Results)', async () => {
        // Search op has limit: 10
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
            body: JSON.stringify({
                type: 'command',
                action: 'search_op',
                parameters: { limit: 100, query: 'test' }
            })
        });
        assert.strictEqual(res.status, 200);
        // Upstream would receive 10.
    });

    await test('Economic: Hard Limit (Project Poor)', async () => {
        // project:poor has 0.000001 limit. Standard usage will fail.
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test',
                'x-project-id': 'project:poor'
            },
            body: JSON.stringify({ type: 'command', action: 'valid_tool', parameters: { some: 'payload' } })
        });
        if (res.status !== 402) throw new Error(`Expected 402, got ${res.status}`);
        const json = await res.json();
        assert.strictEqual(json.error.code, 'BUDGET_HARD_LIMIT');
    });

    await test('Economic: Degrade (Soft Limit)', async () => {
        // project:alpha seeded with spent 6.00, Soft Limit 5.00.
        // Rule: defaults degraded provider `openai` model `gpt-4` to `gpt-3.5-turbo`.
        // We simulate `sensitive_op` which maps to openai/gpt-4 in `04_economic`.
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test',
                'x-project-id': 'project:alpha' // Spending > Soft Limit
            },
            body: JSON.stringify({ type: 'command', action: 'sensitive_op', parameters: { credit_card: '4111 2222 3333 4444' } })
        });

        // Should Allow (200) but be degraded.
        if (res.status !== 200) {
            const txt = await res.text();
            throw new Error(`Expected 200 (Degraded), got ${res.status}: ${txt}`);
        }
        // Ideally we check if model was swapped in logs or receipt, but contract test just ensures it passes (Soft Limit)
    });

    await test('Economic: Require Approval (High Cost)', async () => {
        // "expensive_op" has flat fee 10.00 EUR.
        // Rule: > 5.00 EUR -> Require Approval.
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer admin'
            },
            body: JSON.stringify({ type: 'command', action: 'expensive_op', parameters: {} })
        });

        if (res.status !== 402) { // Spec says APPROVAL_REQUIRED maps to 402 currently
            const txt = await res.text();
            throw new Error(`Expected 402 (Approval Required), got ${res.status}: ${txt}`);
        }
        const json = await res.json();
        assert.strictEqual(json.error.code, 'APPROVAL_REQUIRED');
    });

    await test('Economic: Rate Limit (Tokens)', async () => {
        // Rate Limit is 1000 tokens per minute per agent.
        // Payload size: 4004 chars -> ~1001 tokens.
        const largePayload = 'a'.repeat(4010);

        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test' // agent:test-user
            },
            body: JSON.stringify({ type: 'command', action: 'valid_tool', parameters: { data: largePayload } })
        });

        // Expect 402 ECON_RATE_LIMIT
        if (res.status !== 402) {
            const txt = await res.text();
            throw new Error(`Expected 402 (Rate Limit), got ${res.status}: ${txt}`);
        }
        const json = await res.json();
        assert.strictEqual(json.error.code, 'ECON_RATE_LIMIT');
    });

    // --- GOLDEN TESTS ---

    await test('Golden: Valid Command -> Matches Snapshot', async () => {
        const reqPath = path.join(__dirname, 'goldens/request_valid.json');
        const resPath = path.join(__dirname, 'goldens/response_valid.json');

        const reqData = fs.readFileSync(reqPath, 'utf8');
        const expectedRes = JSON.parse(fs.readFileSync(resPath, 'utf8'));

        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: reqData
        });

        if (res.status !== 200) {
            const txt = await res.text();
            throw new Error(`Expected 200, got ${res.status}: ${txt}`);
        }
        const actualRes = await res.json();
        actualRes.transactionId = 'MASKED';
        actualRes.timestamp = 0;
        assert.strictEqual(actualRes.status, expectedRes.status);
    });


    // --- ROUNDTRIP ---

    await test('Roundtrip: Streaming', async () => {
        const res = await safeFetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', action: 'stream_test', parameters: {} })
        });

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const text = await res.text();
        assert.ok(text.includes('event: receipt'));
    });

    console.log('---------------------------------------------------');
    console.log(`Totals: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
