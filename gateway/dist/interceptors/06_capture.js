"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capture = void 0;
const capture = async (ctx) => {
    console.log('[6] Capture Response');
    if (!ctx.stepResults.upstream) {
        throw new Error('No upstream response captured');
    }
    // Logic to process/transform upstream response could go here
};
exports.capture = capture;
