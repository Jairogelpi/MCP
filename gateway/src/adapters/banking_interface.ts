export interface PayoutResult {
    payoutId: string;
    status: 'PENDING' | 'PAID' | 'FAILED';
    transactionRef?: string;
}

export interface BankingAdapter {
    /**
     * Execute a payout to a specific payee.
     * @param payeeId The DID or internal ID of the payee.
     * @param amount The amount in minor units (cents).
     * @param currency The 3-letter currency code (e.g. 'USD').
     * @param reference A unique reference for idempotency.
     */
    payout(payeeId: string, amount: number, currency: string, reference: string): Promise<PayoutResult>;

    /**
     * Get the current balance of the platform's funding source.
     */
    getBalance(): Promise<{ amount: number; currency: string }>;
}
