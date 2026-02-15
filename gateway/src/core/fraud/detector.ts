import { db } from '../../adapters/database';

interface RiskEvent {
    tenantId: string;
    type: 'SPEND' | 'LOGIN' | 'TOOL_USE';
    amount?: number;
    metadata?: any;
    timestamp: number;
}

export class FraudDetector {
    private tenantProfiles: Record<string, { avgSpend: number, riskScore: number }> = {};

    constructor() {
        // Mock historical data
        this.tenantProfiles['safe-tenant'] = { avgSpend: 100, riskScore: 0 };
        this.tenantProfiles['new-tenant'] = { avgSpend: 0, riskScore: 20 };
    }

    process(event: RiskEvent): { action: 'ALLOW' | 'BLOCK' | 'FLAG', score: number, reason?: string } {
        let score = this.tenantProfiles[event.tenantId]?.riskScore || 50; // Default high for unknown
        let reason = '';

        // Rule 1: Burn Spike
        if (event.type === 'SPEND' && event.amount) {
            const profile = this.tenantProfiles[event.tenantId];
            if (profile && profile.avgSpend > 0) {
                if (event.amount > profile.avgSpend * 20) {
                    score += 100;
                    reason += 'Extreme Burn Spike; ';
                } else if (event.amount > profile.avgSpend * 5) {
                    score += 30;
                    reason += 'High Burn Spike; ';
                }
            }
        }

        // Rule 2: Replay / High Velocity (Mocked simple check)
        if (event.metadata?.velocity > 100) { // ops/sec
            score += 50;
            reason += 'High Velocity; ';
        }

        this.tenantProfiles[event.tenantId] = {
            avgSpend: this.tenantProfiles[event.tenantId]?.avgSpend || 0,
            riskScore: score
        };

        if (score >= 100) return { action: 'BLOCK', score, reason };
        if (score >= 50) return { action: 'FLAG', score, reason };
        return { action: 'ALLOW', score };
    }
}
