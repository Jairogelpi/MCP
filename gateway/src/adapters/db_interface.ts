export interface DatabaseAdapter {
    raw: {
        transaction<T>(fn: (...args: any[]) => Promise<T> | T): Promise<T>;
        run(sql: string, params?: any[]): Promise<any>;
        query(sql: string, params?: any[]): Promise<any[]>;
    };
    chain: {
        getHead(scopeId: string): Promise<any>;
        initChain(scopeId: string, genesisHash: string, receiptId: string): Promise<void>;
        advance(scopeId: string, newHash: string, receiptId: string, oldHash: string): Promise<void>;
        storeReceipt(receipt: any, hash: string, signature: string): Promise<void>;
    };
    pricing: {
        upsert(rate: any): Promise<void>;
        findActive(criteria: any): Promise<any>;
        clear(): Promise<void>;
    };
    budgets: {
        upsert(budget: any): Promise<void>;
        get(budgetId: string): Promise<any>;
        incrementSpend(budgetId: string, amount: number): Promise<void>;
        clear(): Promise<void>;
    };
    rates: {
        checkAndIncrement(key: string, amount: number, limit: number, windowMs: number): Promise<boolean>;
    };
    ledger: {
        getAccount(id: string): Promise<any>;
        upsertAccount(account: any): Promise<void>;
        updateBalance(id: string, reservedDelta: number, settledDelta: number): Promise<void>;
        insertEntry(entry: any): Promise<number | string>;
        createReservation(res: any): Promise<void>;
        updateReservationState(requestId: string, state: string, settledAmount: number): Promise<void>;
        getReservation(requestId: string): Promise<any>;
        getExpiredReservations(now: number): Promise<any[]>;
    };
    keys: {
        getActiveKey(keyId: string): Promise<any>;
        upsertKey(key: any): Promise<void>;
    };
}
