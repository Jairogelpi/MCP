export class RevocationManager {
    // In-memory mock of a Certificate Revocation List (CRL)
    private bannedPublishers: Set<string> = new Set(['did:mcp:pub:malware_inc']);
    private bannedPackages: Set<string> = new Set(['mcp-crypto-miner']);

    isRevoked(publisherId: string, packageId: string): boolean {
        if (this.bannedPublishers.has(publisherId)) {
            console.warn(`[Revocation] Publisher ${publisherId} is BANNED.`);
            return true;
        }
        if (this.bannedPackages.has(packageId)) {
            console.warn(`[Revocation] Package ${packageId} is REVOKED.`);
            return true;
        }
        return false;
    }

    banPublisher(publisherId: string) {
        this.bannedPublishers.add(publisherId);
    }
}
