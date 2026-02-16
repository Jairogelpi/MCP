import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from './adapters/database';
import { IdentityManager } from './core/auth/identity_manager';

export function registerLedgerRoutes(server: FastifyInstance) {

    // Re-implement adminAuth locally for this module
    const adminAuth = async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'AUTH_REQUIRED' });
        }
        const token = authHeader.replace('Bearer ', '');
        const identity = await IdentityManager.getIdentity(token);

        if (!identity) {
            return reply.status(401).send({ error: 'INVALID_TOKEN' });
        }
        if (identity.role !== 'admin') {
            return reply.status(403).send({ error: 'ADMIN_ROLE_REQUIRED' });
        }
        (request as any).identity = identity;
    };

    // Example Ledger Route (Replace with your actual logic)
    server.post('/admin/ledger/entries', { preHandler: [adminAuth] }, async (request, reply) => {
        const { tenantId } = request.body as any;

        // Example DB usage
        const entries = await db.raw.query('SELECT * FROM ledger_entries WHERE tenant_id = ? LIMIT 10', [tenantId]);

        return { success: true, entries };
    });
}
