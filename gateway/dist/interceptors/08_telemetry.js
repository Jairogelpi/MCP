"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetry = void 0;
const telemetry = async (ctx) => {
    console.log('[8] Telemetry Emit');
    console.log(`[TELEMETRY] Request ${ctx.request.id} finished in ${Date.now() - (ctx.stepResults.normalized?.meta.timestamp || 0)}ms`);
};
exports.telemetry = telemetry;
