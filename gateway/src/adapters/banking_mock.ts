import { BankingAdapter, PayoutResult } from './banking_interface';
import { randomUUID } from 'crypto';

export class MockBankingAdapter implements BankingAdapter {
    async payout(payeeId: string, amount: number, currency: string, reference: string): Promise<PayoutResult> {
        console.log(`[MockBank] Sending ${amount / 100} ${currency} to ${payeeId} (Ref: ${reference})`);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate random failure (1%)
        if (Math.random() < 0.01) {
            console.error('[MockBank] Transaction Failed (Simulated)');
            return { payoutId: 'failed', status: 'FAILED' };
        }

        return {
            payoutId: `tx_${randomUUID()}`,
            status: 'PENDING',
            transactionRef: reference
        };
    }

    async getBalance(): Promise<{ amount: number; currency: string; }> {
        return { amount: 100000000, currency: 'USD' }; // $1M Mock Reserve
    }
}
