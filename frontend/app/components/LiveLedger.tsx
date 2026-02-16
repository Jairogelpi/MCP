import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LedgerEntry {
    id: string;
    timestamp: number;
    action: string;
    status: string;
    cost: number;
    error_code?: string;
    latency?: number;
    hash: string;
}

interface LiveLedgerProps {
    tenantId: string;
}

export const LiveLedger: React.FC<LiveLedgerProps> = ({ tenantId }) => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLedger = async () => {
        if (!user || !tenantId) return;
        try {
            const res = await fetch(`http://localhost:3000/admin/ledger/${tenantId}/recent`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.receipts) {
                setEntries(data.receipts);
            }
        } catch (err) {
            console.error('Failed to fetch ledger:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
        const interval = setInterval(fetchLedger, 5000); // Poll every 5s for "Live" feel
        return () => clearInterval(interval);
    }, [user, tenantId]);

    if (loading && entries.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-xs uppercase animate-pulse">Synchronizing Ledger...</div>;
    }

    return (
        <div className="glass p-6 rounded-3xl space-y-4 border border-white/5">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Network Ledger</h3>
                </div>
                <span className="text-[10px] font-mono text-gray-600 uppercase">{entries.length} Recent Tx</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[9px] font-bold text-gray-600 uppercase tracking-widest border-b border-white/5">
                            <th className="pb-3 pl-2">Time</th>
                            <th className="pb-3">Action (Tool)</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Latency</th>
                            <th className="pb-3 text-right pr-2">Cost</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                        {entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="py-3 pl-2 text-gray-500">
                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                                <td className="py-3 text-blue-300 font-bold">
                                    {entry.action}
                                </td>
                                <td className="py-3">
                                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${entry.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            entry.status === 'FAILURE' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                'bg-gray-500/10 text-gray-400'
                                        }`}>
                                        {entry.error_code || entry.status}
                                    </span>
                                </td>
                                <td className="py-3 text-gray-500">
                                    {entry.latency ? `${entry.latency}ms` : '-'}
                                </td>
                                <td className="py-3 text-right pr-2 font-bold text-white">
                                    {entry.cost > 0 ? `€${entry.cost.toFixed(4)}` : '-'}
                                </td>
                            </tr>
                        ))}
                        {entries.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-600 text-[10px] uppercase tracking-widest">
                                    No active traffic recorded
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
