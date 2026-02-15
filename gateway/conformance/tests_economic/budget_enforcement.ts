import { ConformanceTest, TestResult } from '../types';

export const budgetEnforcement: ConformanceTest = {
    id: 'ECON-01',
    name: 'Budget Enforcement (402)',
    description: 'Verifies that requests are blocked when budget is exceeded.',
    category: 'economic',
    execute: async (client) => {
        try {
            await client.callTool('finance-core', 'get_balance', { account: 'OVERRUN' });
            return { success: false, message: 'Request should have been blocked' };
        } catch (err: any) {
            if (err.message.includes('BUDGET_EXCEEDED')) {
                return { success: true, message: 'Caught expected BUDGET_EXCEEDED' };
            }
            return { success: false, message: `Wrong error: ${err.message}` };
        }
    }
};
