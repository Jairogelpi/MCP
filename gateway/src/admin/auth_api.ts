import { FastifyInstance } from 'fastify';
import { AuthService } from '../core/auth/auth_service';

export function registerAuthRoutes(fastify: FastifyInstance) {
    /**
     * POST /auth/register
     */
    fastify.post('/auth/register', async (request, reply) => {
        const { email, name, password } = request.body as any;

        if (!email || !name || !password) {
            return reply.status(400).send({ success: false, error: 'MISSING_FIELDS' });
        }

        const result = await AuthService.register(email, name, password);
        if (result.success) {
            return reply.status(201).send(result);
        } else {
            return reply.status(400).send(result);
        }
    });

    /**
     * POST /auth/login
     */
    fastify.post('/auth/login', async (request, reply) => {
        const { email, password } = request.body as any;

        if (!email || !password) {
            return reply.status(400).send({ success: false, error: 'MISSING_FIELDS' });
        }

        const result = await AuthService.login(email, password);
        if (result.success) {
            return reply.status(200).send(result);
        } else {
            return reply.status(401).send(result);
        }
    });
}
