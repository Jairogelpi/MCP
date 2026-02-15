export interface IdentityResult {
    entityId: string;
    status: 'VERIFIED' | 'REJECTED' | 'PENDING';
    riskScore: number; // 0-100
    verificationId?: string;
    checks: string[];
}

export interface IdentityAdapter {
    /**
     * Verify the identity of an entity (individual or business).
     * @param entityId The DID or internal ID.
     * @param data Optional minimal data (e.g. email, tax ID) if not preregistered.
     */
    verifyEntity(entityId: string, data?: any): Promise<IdentityResult>;

    /**
     * Check if an entity is on any sanctions list (OFAC, etc).
     */
    checkSanctions(entityId: string): Promise<boolean>;
}
