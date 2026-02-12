"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = void 0;
const crypto_1 = require("crypto");
const normalize = async (ctx) => {
    console.log('[2] Normalize');
    const raw = ctx.stepResults.raw;
    const routeParams = raw._routeParams; // Injected in server.ts
    // Construct Protocol v0.1.0 Envelope
    const envelope = {
        id: ctx.request.id || (0, crypto_1.randomUUID)(),
        version: '0.1.0',
        type: raw.type || 'command', // Default to command if unspecified
        action: raw.action || 'unknown',
        parameters: raw.parameters || {},
        meta: {
            timestamp: Date.now(),
            source: ctx.request.ip,
            tenant: routeParams.tenant,
            targetServer: routeParams.server,
            // authContext populated later or here if we moved Auth to step 1
        }
    };
    ctx.stepResults.normalized = envelope;
};
exports.normalize = normalize;
