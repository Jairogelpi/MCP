export class DataGuard {
    private static PII_PATTERNS = {
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        credit_card: /\b(?:\d[ -]*?){13,16}\b/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        api_key: /(sk|pk|key|token)_[a-zA-Z0-9]{20,}/gi
    };

    /**
     * Scans any object (args) for PII or secrets.
     * Returns an array of detected types.
     */
    static scan(data: any): string[] {
        const found: string[] = [];
        const str = JSON.stringify(data);

        for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
            if (pattern.test(str)) {
                found.push(type);
            }
        }

        return found;
    }

    /**
     * Redacts PII from an object based on specific types.
     */
    static redact(data: any, types: string[]): any {
        let str = JSON.stringify(data);

        for (const type of types) {
            const pattern = (this.PII_PATTERNS as any)[type];
            if (pattern) {
                str = str.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
            }
        }

        return JSON.parse(str);
    }
}
