import { LawEnforcer } from '../src/core/governance/law_enforcer';
import { ActionEnvelope } from '../src/core/contract';

async function testIronCage() {
    console.log('--- STARTING IRON CAGE (DETERMINISTIC) VALIDATION ---');

    const enforcer = new LawEnforcer();

    const testCases: { name: string; envelope: Partial<ActionEnvelope> }[] = [
        {
            name: 'Valid Tenant Access',
            envelope: {
                action: 'get_balance',
                parameters: { accountId: 'acme-01' },
                meta: { tenant: 'acme', targetServer: 'finance-core', timestamp: Date.now(), source: 'test' }
            }
        },
        {
            name: 'Illegal Cross-Tenant Access (Should BLOCK)',
            envelope: {
                action: 'get_balance',
                parameters: { accountId: 'evil-01' },
                meta: { tenant: 'acme', targetServer: 'finance-core', timestamp: Date.now(), source: 'test' }
            }
        },
        {
            name: 'Self-Transfer Invariant (Should BLOCK)',
            envelope: {
                action: 'transfer',
                parameters: { from: 'acme-wallet', to: 'acme-wallet', amount: 100 },
                meta: { tenant: 'acme', targetServer: 'finance-core', timestamp: Date.now(), source: 'test' }
            }
        },
        {
            name: 'Negative Amount Invariant (Should BLOCK)',
            envelope: {
                action: 'transfer',
                parameters: { from: 'acme-01', to: 'acme-99', amount: -500 },
                meta: { tenant: 'acme', targetServer: 'finance-core', timestamp: Date.now(), source: 'test' }
            }
        }
    ];

    for (const test of testCases) {
        console.log(`\nTesting Case: ${test.name}`);
        const result = await enforcer.enforceInvariants(test.envelope as ActionEnvelope);
        if (result.passed) {
            console.log('✅ PASSED (Allowed)');
        } else {
            console.log(`❌ BLOCKED (Violation: ${result.violationCode})`);
            console.log(`- Reason: ${result.reason}`);
        }
    }

    console.log('\n--- DETERMINISTIC VALIDATION COMPLETE ---');
}

testIronCage();
