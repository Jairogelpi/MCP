export const db = {
    reservations: {
        create: async (amount: number) => {
            console.log(`[DB] Created reservation for ${amount}`);
            return { id: 'res_' + Date.now(), status: 'reserved' };
        },
        commit: async (id: string) => {
            console.log(`[DB] Committed reservation ${id}`);
        }
    }
};
