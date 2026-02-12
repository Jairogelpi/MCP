const { spawn } = require('child_process');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:3000';
const TENANT = 'acme';
const SERVER = 'finance-core';

// Test Config
const CONCURRENT_REQUESTS = 50;
const COST_PER_REQ = 1.0;
const BUDGET_LIMIT = 20.0; // Only 20 should succeed
const SCOPE_ID = 'project:stress_test';

async function runConfig() {
    // 1. Create a budget for stress test
    // We can't easily inject SQL here without direct DB access or an admin tool.
    // For E2E, we rely on the system state.
    // BUT we can use an internal dev endpoint if we had one, or manual seed.
    // The `seed_data.js` approach is best.
    // We'll assume the environment is running and we can just hit it.
    // But we need to ensure the budget exists.
    // Use `project:alpha` (Limit 100) or modify seed?
    // `project:alpha` has Hard Limit 100.
    // If we send 50 requests of 10 EUR, we need 500 EUR -> Should fail after 10.
    // Let's use `project:alpha` with `expensive_op` (10 EUR).
    // Limit is 100. So 10 requests should pass, 40 fail.
}

async function request(id) {
    const start = Date.now();
    try {
        const res = await fetch(`${BASE_URL}/mcp/${TENANT}/${SERVER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer admin', // Admin to bypass some policies?
                'x-project-id': 'project:concurrency' // Hard Limit 20.00
            },
            body: JSON.stringify({
                type: 'command',
                action: 'search_op', // Cost 1.00 (limit=100)
                parameters: { limit: 100, _reqId: id }
            }),
            timeout: 10000
        });

        const status = res.status;
        const text = await res.text();

        // Log error if not 200/402
        if (status >= 500) console.error(`[${id}] 500 Error: ${text}`);
        if (status === 402) {
            // console.log(`[${id}] 402: ${text}`); // Optional debug
        }

        return { id, status, time: Date.now() - start, error: status >= 400 ? text : null };
    } catch (e) {
        return { id, status: 0, time: Date.now() - start, error: e.message };
    }
}

async function run() {
    console.log(`🚀 Starting Load Test: ${CONCURRENT_REQUESTS} requests...`);

    const promises = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        promises.push(request(i));
    }

    const results = await Promise.all(promises);

    // Analyze
    const passed = results.filter(r => r.status === 200).length;
    const denied = results.filter(r => r.status === 402).length; // Budget or Approval
    const failed = results.filter(r => r.status >= 500 || r.status === 0).length;

    console.log('---------------------------------------------------');
    console.log(`Passed (200): ${passed}`);
    console.log(`Denied (402): ${denied}`);
    console.log(`Failed (5xx): ${failed}`);

    if (failed > 0) {
        console.error('❌ FAILED: internal errors detected.');
        results.filter(r => r.status >= 500).forEach(r => console.error(r));
        process.exit(1);
    }

    // Check Budget Logic
    // project:alpha Hard Limit is 100.
    // expensive_op is 10 EUR.
    // Should pass exactly 10 requests?
    // Wait, expensive_op triggers "Require Approval" (> 5 EUR) policy rule in `002_rules.sql`.
    // "expensive_op" -> require_approval.
    // If "require_approval", 04_economic returns 402 APPROVAL_REQUIRED.
    // So ALL might be 402?
    // We need a tool that costs money but is ALLOWED.
    // `search_op` cost is dynamic? 0.01 * args.limit.
    // `sensitive_op` cost is model based?
    // Let's use `search_op` with limit=100 -> Cost 1.00 EUR.
    // Hard Limit 100.
    // If we send 150 requests, 100 should pass, 50 fail.

    console.log('⚠️  Note: Test results depend on current Budget state.');
    console.log('    Ensure project:alpha has sufficient funds and no previous spend for accurate count.');
}

run();
