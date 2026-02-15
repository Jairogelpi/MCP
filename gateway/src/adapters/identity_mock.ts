import { IdentityAdapter, IdentityResult } from './identity_interface';

export class MockIdentityAdapter implements IdentityAdapter {
    async verifyEntity(entityId: string, data?: any): Promise<IdentityResult> {
        console.log(`[MockID] Verifying: ${entityId}`);

        const isSanctioned = entityId.includes('evil') || entityId.includes('lazarus');

        return {
            entityId,
            status: isSanctioned ? 'REJECTED' : 'VERIFIED',
            riskScore: isSanctioned ? 100 : 5,
            verificationId: `v_${Date.now()}`,
            checks: ['IDENTITY', 'SANCTIONS', 'ADVERSE_MEDIA']
        };
    }

    async checkSanctions(entityId: string): Promise<boolean> {
        return entityId.includes('evil');
    }
}
