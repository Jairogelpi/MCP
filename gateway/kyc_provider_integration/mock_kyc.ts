import { IdentityAdapter, IdentityResult } from '../src/adapters/identity_interface';

export class MockKYCProvider implements IdentityAdapter {
    async verifyEntity(entityId: string, data?: any): Promise<IdentityResult> {
        console.log(`[KYC] Verifying entity: ${entityId}`);

        // Simulate check
        const isSanctioned = entityId.includes('evil');

        return {
            entityId,
            status: isSanctioned ? 'REJECTED' : 'VERIFIED',
            riskScore: isSanctioned ? 100 : 5,
            checks: ['IDENTITY', 'SANCTIONS', 'ADVERSE_MEDIA']
        };
    }

    async checkSanctions(entityId: string): Promise<boolean> {
        return entityId.includes('evil');
    }
}
