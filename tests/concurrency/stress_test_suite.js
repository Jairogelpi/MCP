
const BASE_URL = 'http://localhost:3000/mcp/acme/finance-core';
const AUTH_HEADER = 'Bearer test';

async function runTests() {
    console.log('\n--- PHASE 4.7 REAL CONCURRENCY SUITE (FETCH + AUTH + ENVELOPE) ---');

    console.log('\n[TEST 1] Concurrent Race (50 reqs vs tight budget)');
    // Presupuesto tight: 0.20 EUR. 
    // Cada reserva ~ 0.05 EUR. Deben entrar exactamente 4 si no hay race.
    const promises = [];
    for (let i = 0; i < 50; i++) {
        promises.push(
            fetch(BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': AUTH_HEADER,
                    'x-project-id': 'project:concurrency'
                },
                body: JSON.stringify({
                    type: 'command',
                    version: '1.0.0',
                    action: 'valid_tool',
                    parameters: { query: 'test' + i }
                })
            })
        );
    }
    const results = await Promise.all(promises);
    const success = results.filter(r => r.status === 200).length;
    const limited = results.filter(r => r.status === 402).length;
    const other = results.filter(r => r.status !== 200 && r.status !== 402).length;

    console.log(`Results: ${success} Success, ${limited} Budget Exceeded, ${other} Other Errors`);
    if (success <= 4) console.log('✅ PASS: Budget strictly enforced');
    else console.error(`❌ FAIL: Too many requests passed (${success})`);

    console.log('\n[TEST 2] Idempotency (Repeat same Request-ID)');
    const reqId = 'idem-' + Date.now();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': AUTH_HEADER,
        'x-request-id': reqId
    };

    const body = JSON.stringify({
        type: 'command',
        version: '1.0.0',
        action: 'valid_tool',
        parameters: {}
    });

    const r1 = await fetch(BASE_URL, { method: 'POST', headers, body });
    const r2 = await fetch(BASE_URL, { method: 'POST', headers, body });

    console.log(`R1: ${r1.status}, R2: ${r2.status}`);
    if (r2.status === 200) console.log('✅ PASS: Idempotent replay success (status 200)');
    else console.error('❌ FAIL: Idempotency failed');

    console.log('\n[TEST 3] Refund (Real cost < Reserved)');
    const r3 = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': AUTH_HEADER,
            'x-test-tokens-in': '1',
            'x-test-tokens-out': '1'
        },
        body: JSON.stringify({
            type: 'command',
            version: '1.0.0',
            action: 'valid_tool',
            parameters: {}
        })
    });
    console.log(`Status: ${r3.status}`);

    console.log('\n[TEST 4] Overrun (Real cost > Reserved)');
    const r4 = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': AUTH_HEADER,
            'x-test-tokens-in': '1000',
            'x-test-tokens-out': '50000'
        },
        body: JSON.stringify({
            type: 'command',
            version: '1.0.0',
            action: 'valid_tool',
            parameters: {}
        })
    });
    console.log(`Status: ${r4.status}`);

    console.log('\n[TEST 5] Reaper (Timeout VOID)');
    console.log('Sending request that will delay 65s...');

    fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': AUTH_HEADER,
            'x-test-delay-ms': '65000'
        },
        body: JSON.stringify({
            type: 'command',
            version: '1.0.0',
            action: 'valid_tool',
            parameters: {}
        })
    }).catch(() => { });

    console.log('Waiting 10s to see it RESERVED in logs...');
    await new Promise(r => setTimeout(r, 10000));

    console.log('Waiting another 60s for Reaper to act...');
    await new Promise(r => setTimeout(r, 60000));
    console.log('✅ INFO: Check gateway logs for "Reaper: Cleaning up expired"');

    console.log('\n--- SUITE COMPLETE ---');
}

runTests();
