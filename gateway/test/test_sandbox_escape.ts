import { SovereignSandbox } from '../src/core/governance/sovereign_sandbox';
import { ActionEnvelope, PipelineContext } from '../src/core/contract';

async function testSandbox() {
    console.log('--- STARTING SOVEREIGN SANDBOX (ZERO-TRUST) VALIDATION ---');

    const sandbox = new SovereignSandbox();

    const testCases: { name: string; envelope: Partial<ActionEnvelope>; context: Partial<PipelineContext> }[] = [
        {
            name: 'Legitimate Economic Action',
            envelope: {
                action: 'transfer',
                meta: { tenant: 'acme', targetServer: 'finance-core', timestamp: Date.now(), source: 'test' }
            },
            context: {
                stepResults: {
                    economic: {
                        cost: 10,
                        currency: 'EUR',
                        reserve_id: 'res-123',
                        budget_scopes: ['acme-wallet']
                    }
                }
            }
        },
        {
            name: 'Shadow Escape Attempt: Ownership Drift',
            envelope: {
                action: 'transfer',
                meta: { tenant: 'acme', targetServer: 'finance-core', timestamp: Date.now(), source: 'test' }
            },
            context: {
                stepResults: {
                    economic: {
                        cost: 10,
                        currency: 'EUR',
                        reserve_id: 'res-123',
                        budget_scopes: ['evil-hacker-wallet'] // This scope doesn't belong to 'acme'
                    }
                }
            }
        },
        {
            name: 'Shadow Escape Attempt: Missing Reservation',
            envelope: {
                action: 'transfer',
                meta: { tenant: 'acme', targetServer: 'finance-core', timestamp: Date.now(), source: 'test' }
            },
            context: {
                stepResults: {
                    economic: {
                        cost: 10,
                        currency: 'EUR',
                        budget_scopes: ['acme-wallet']
                        // Missing reserve_id
                    }
                }
            }
        }
    ];

    for (const test of testCases) {
        console.log(`\nTesting Case: ${test.name}`);
        const result = await sandbox.verifyStateTransition(test.envelope as ActionEnvelope, test.context as PipelineContext);
        if (result.passed) {
            console.log('✅ PASSED (State Transition Valid)');
        } else {
            console.log(`❌ BLOCKED (Violation: ${result.violationCode})`);
            console.log(`- Reason: ${result.reason}`);
        }
    }

    console.log('\n--- ZERO-TRUST VALIDATION COMPLETE ---');
}

testSandbox();
