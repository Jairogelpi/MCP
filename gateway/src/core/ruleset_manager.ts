import { db } from '../adapters/database';
import { PolicyRuleset } from './contract';

/**
 * Manages the loading and caching of Policy Rulesets.
 * Queries the 'policy_rulesets' table.
 */
export class RulesetManager {
    private static instance: RulesetManager;
    private cache: Map<string, { ruleset: PolicyRuleset, loadedAt: number }> = new Map();
    private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute cache for performance

    private constructor() { }

    public static getInstance(): RulesetManager {
        if (!RulesetManager.instance) {
            RulesetManager.instance = new RulesetManager();
        }
        return RulesetManager.instance;
    }

    /**
     * Gets the active ruleset for a tenant.
     * Tries cache first, then DB, then falls back to default empty ruleset.
     */
    public async getActiveRuleset(tenantId: string): Promise<PolicyRuleset> {
        // 1. Check Cache
        const cached = this.cache.get(tenantId);
        if (cached && (Date.now() - cached.loadedAt < this.CACHE_TTL_MS)) {
            return cached.ruleset;
        }

        console.log(`[RulesetManager] Fetching active ruleset for ${tenantId}`);

        try {
            // 2. Fetch from DB
            const rows = await db.raw.query(`
                SELECT content, version, checksum 
                FROM policy_rulesets 
                WHERE tenant_id = ? AND is_active = 1 
                LIMIT 1
            `, [tenantId]) as any[];

            if (rows.length > 0) {
                const row = rows[0];
                const ruleset: PolicyRuleset = JSON.parse(row.content);

                // Integrity check could go here (verify checksum)

                // Cache it
                this.cache.set(tenantId, { ruleset, loadedAt: Date.now() });
                return ruleset;
            }
        } catch (e) {
            console.error(`[RulesetManager] Failed to load ruleset for ${tenantId}`, e);
        }

        // 3. Fallback (Default Deny/Empty)
        console.warn(`[RulesetManager] No active ruleset found for ${tenantId}, returning default empty.`);
        return {
            tenant_id: tenantId,
            version: '0.0.0-fallback',
            created_at: Date.now(),
            rules: [] // Default Deny (PDP default behavior when no rules match)
        };
    }

    /**
     * Invalidates the cache for a tenant (e.g. after publishing new rules).
     */
    public invalidateCache(tenantId: string) {
        this.cache.delete(tenantId);
        console.log(`[RulesetManager] Cache invalidated for ${tenantId}`);
    }
}
