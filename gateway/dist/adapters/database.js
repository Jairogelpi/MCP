"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.db = {
    reservations: {
        create: async (amount) => {
            console.log(`[DB] Created reservation for ${amount}`);
            return { id: 'res_' + Date.now(), status: 'reserved' };
        },
        commit: async (id) => {
            console.log(`[DB] Committed reservation ${id}`);
        }
    }
};
