const BASE_URL = 'http://localhost:3000';

async function testRBAC() {
    console.log('🚀 Starting RBAC Isolation Verification (Native Fetch)...\n');

    const globalAdminKey = 'admin_secret_123';
    const tenantAdminKey = 'demo-key'; // Admin of 'demo-client'
    const viewerKey = 'viewer_secret_456';

    const getHeaders = (key: string) => ({
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
    });

    // 1. GLOBAL ADMIN TESTS
    console.log('--- Global Admin Tests ---');
    try {
        const res = await fetch(`${BASE_URL}/admin/tenants`, { headers: getHeaders(globalAdminKey) });
        if (res.ok) {
            console.log('✅ Global Admin can access /admin/tenants');
        } else {
            console.error('❌ Global Admin failed to access /admin/tenants', res.status, await res.text());
        }
    } catch (e: any) {
        console.error('❌ Network error during Global Admin test', e.message);
    }

    // 2. TENANT ADMIN TESTS
    console.log('\n--- Tenant Admin (demo-client) Tests ---');
    try {
        const res = await fetch(`${BASE_URL}/admin/tenants`, { headers: getHeaders(tenantAdminKey) });
        if (res.status === 403) {
            console.log('✅ Tenant Admin blocked from /admin/tenants (Forbidden)');
        } else {
            console.error('❌ Tenant Admin test /admin/tenants failed. Status:', res.status);
        }
    } catch (e: any) {
        console.error('❌ Network error during Tenant Admin test', e.message);
    }

    try {
        const res = await fetch(`${BASE_URL}/admin/org/details/demo-client`, { headers: getHeaders(tenantAdminKey) });
        if (res.ok) {
            console.log('✅ Tenant Admin can access their own org (demo-client)');
        } else {
            console.error('❌ Tenant Admin failed to access their own org', res.status);
        }
    } catch (e: any) {
        console.error('❌ Network error', e.message);
    }

    try {
        const res = await fetch(`${BASE_URL}/admin/org/details/acme`, { headers: getHeaders(tenantAdminKey) });
        if (res.status === 403) {
            console.log('✅ Tenant Admin blocked from acme org (Forbidden)');
        } else {
            console.error('❌ Tenant Admin test acme org failed. Status:', res.status);
        }
    } catch (e: any) {
        console.error('❌ Network error', e.message);
    }

    // 3. BUDGET OWNERSHIP TESTS
    console.log('\n--- Budget Ownership Tests ---');
    try {
        const res = await fetch(`${BASE_URL}/admin/budgets/tool/mcp:finance:transfer`, {
            method: 'POST',
            headers: getHeaders(tenantAdminKey),
            body: JSON.stringify({ limit: 1000 })
        });
        if (res.status === 403) {
            console.log('✅ Tenant Admin blocked from global tool budget');
        } else {
            console.error('❌ Tenant Admin test tool budget failed. Status:', res.status, await res.text());
        }
    } catch (e: any) {
        console.error('❌ Network error', e.message);
    }

    console.log('\n🏁 RBAC Isolation Verification Complete.');
}

testRBAC();
