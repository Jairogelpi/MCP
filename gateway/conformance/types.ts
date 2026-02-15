export interface ConformanceTest {
    id: string;
    name: string;
    description: string;
    category: 'policy' | 'economic' | 'ledger' | 'receipts' | 'observability';
    execute: (client: any) => Promise<TestResult>;
}

export interface TestResult {
    success: boolean;
    message: string;
    details?: any;
}

export interface ConformanceConfig {
    baseUrl: string;
    tenantId: string;
    apiKey?: string;
    publicKey: string;
}
