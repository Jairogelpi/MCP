import { ActionEnvelope } from '../contract';

export class PIITransformer {
    private static PII_KEYS = new Set([
        'password', 'passwd', 'secret', 'token', 'api_key',
        'credit_card', 'cc_number', 'ssn', 'social_security'
    ]);

    private static REGEX = {
        EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
        CREDIT_CARD: /\b(?:\d[ -]*?){13,19}\b/,
        SSN: /\b\d{3}-\d{2}-\d{4}\b/
    };

    static async apply(envelope: ActionEnvelope, fieldsToScan: string[]): Promise<void> {
        // fieldsToScan is usually just ["*"] or specific fields. 
        // For this implementation, we will perform a deep scan of ALL parameters 
        // if the rule triggers it (e.g. "redactPII": ["*"] or just boolean true).
        // If the rule specifies fields ["credit_card"], we only look at those keys.

        // However, the spec says "redactPII: ['credit_card', 'ssn']". 
        // This usually means "Redact these keys". 
        // But our "Value-Based" spec says "Scan string values".

        // Hybrid approach:
        // 1. If key matches fieldsToScan OR PII_KEYS -> REDACT.
        // 2. If value matches Regex -> REDACT.

        if (envelope.parameters) {
            this.recursiveScan(envelope.parameters, fieldsToScan);
        }
    }

    private static recursiveScan(obj: any, targetKeys: string[]) {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
            const value = obj[key];
            const lowerKey = key.toLowerCase();

            // 1. Key-based Check
            if (this.PII_KEYS.has(lowerKey) || targetKeys.includes(key)) {
                obj[key] = '***REDACTED***';
                continue;
            }

            // 2. Value-based Check (Strings)
            if (typeof value === 'string') {
                if (this.REGEX.EMAIL.test(value) ||
                    this.REGEX.CREDIT_CARD.test(value) ||
                    this.REGEX.SSN.test(value)) {
                    obj[key] = '***REDACTED***';
                }
            }
            // 3. Recursion
            else if (typeof value === 'object') {
                this.recursiveScan(value, targetKeys);
            }
        }
    }
}
