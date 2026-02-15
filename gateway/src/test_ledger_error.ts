
import { LedgerManager } from './core/ledger/ledger_manager';
import { db } from './adapters/database';

async function test() {
    try {
        console.log('Testing LedgerManager...');
        const ledger = LedgerManager.getInstance();
        console.log('Got Ledger Instance');

        const context = {
            requestId: 'test-req-' + Date.now(),
            tenantId: 'acme',
            budgetScopes: ['tenant:acme'], // Ensure this scope exists or is handled
            amount: 10,
            currency: 'EUR',
            meta: { tool: 'test' }
        };

        console.log('Reserving...', context);
        const res = ledger.reserve(context);
        console.log('Reserve Result:', res);

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    }
}

test();
