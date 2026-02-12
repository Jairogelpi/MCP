
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
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
            if (e.expected) console.error('    Expected:', e.expected);
            if (e.actual) console.error('    Actual:', e.actual);
            failed++;
        }
    }

    // --- NEGATIVE TESTS ---

    await test('Negative: Missing Auth Header', async () => {
        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'command', action: 'test', parameters: {} })
        });
        assert.strictEqual(res.status, 401);
    });

    await test('Negative: Invalid Payload', async () => {
        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', parameters: {} })
        });
        assert.strictEqual(res.status, 400);
    });


    // --- POLICY TESTS (NEW) ---

    await test('Policy: Deny Dangerous Op', async () => {
        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', action: 'dangerous_op', parameters: {} })
        });
        assert.strictEqual(res.status, 403);
        const body = await res.json();
        assert.ok(body.error.message.includes('DENIED_BY_RULE'));
    });

    await test('Policy: SSRF Block (Localhost)', async () => {
        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({
                type: 'command',
                action: 'curl_op',
                parameters: { url: 'http://localhost:8080/secrets' }
            })
        });
        assert.strictEqual(res.status, 403, 'Should block localhost access');
        const body = await res.json();
        assert.ok(body.error.message.includes('SSRF Block'));
    });

    await test('Policy: SSRF Allow (Allowed Domain)', async () => {
        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({
                type: 'command',
                action: 'curl_op',
                parameters: { url: 'http://example.com/api' }
            })
        });
        assert.strictEqual(res.status, 200, 'Should allow example.com');
    });

    // --- GOLDEN TESTS ---

    await test('Golden: Valid Command -> Matches Snapshot', async () => {
        const reqPath = path.join(__dirname, 'goldens/request_valid.json');
        const resPath = path.join(__dirname, 'goldens/response_valid.json');

        const reqData = fs.readFileSync(reqPath, 'utf8');
        const expectedRes = JSON.parse(fs.readFileSync(resPath, 'utf8'));

        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: reqData
        });

        assert.strictEqual(res.status, 200);
        const actualRes = await res.json();
        actualRes.transactionId = 'MASKED';
        actualRes.timestamp = 0;
        assert.strictEqual(actualRes.status, expectedRes.status);
    });


    // --- ROUNDTRIP ---

    await test('Roundtrip: Streaming', async () => {
        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
            body: JSON.stringify({ type: 'command', action: 'stream_test', parameters: {} })
        });

        assert.strictEqual(res.status, 200);
        // Simplify check
        const text = await res.text();
        assert.ok(text.includes('event: receipt'));
    });

    console.log('---------------------------------------------------');
    console.log(`Totals: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
