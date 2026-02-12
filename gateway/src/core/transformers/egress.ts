import { ActionEnvelope, PolicyReasonCodes } from '../contract';

export class EgressTransformer {
    static async apply(envelope: ActionEnvelope, config: { allowList?: string[], blockPrivate?: boolean }): Promise<void> {
        const urlString = envelope.parameters['url'];
        if (!urlString || typeof urlString !== 'string') return;

        try {
            const url = new URL(urlString);
            const hostname = url.hostname;

            // 1. Localhost Checks
            if (hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '[::1]' ||
                hostname === '0.0.0.0') {
                throw new Error(PolicyReasonCodes.SSRF_BLOCKED);
            }

            // 2. Private IP Checks (Basic Regex)
            if (config.blockPrivate) {
                if (this.isPrivateIP(hostname)) {
                    throw new Error(PolicyReasonCodes.SSRF_BLOCKED);
                }
            }

            // 3. AllowList
            if (config.allowList && config.allowList.length > 0) {
                const allowed = config.allowList.some(domain => hostname === domain || hostname.endsWith('.' + domain));
                if (!allowed) {
                    throw new Error(PolicyReasonCodes.SSRF_BLOCKED);
                }
            }

        } catch (err: any) {
            if (err.message === PolicyReasonCodes.SSRF_BLOCKED) throw err;
            // If URL parse fails, maybe block? Or ignore?
            // Safer to block if it looks like a URL but fails parsing
            console.warn(`[EGRESS] Failed to parse URL: ${urlString}`);
            // Let's assume valid URL required if 'url' param exists
            throw new Error(PolicyReasonCodes.POLICY_VIOLATION);
        }
    }

    private static isPrivateIP(ip: string): boolean {
        // 10.x.x.x
        if (ip.startsWith('10.')) return true;
        // 192.168.x.x
        if (ip.startsWith('192.168.')) return true;
        // 172.16.x.x - 172.31.x.x
        if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
        return false;
    }
}
