'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { GATEWAY_URL } from '../../../lib/config';

interface ApprovalRequest {
    id: string;
    tenant_id: string;
    envelope_hash: string;
    agent_id: string | null;
    status: string;
    created_at: number;
}

export default function ApprovalsPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    useEffect(() => {
        if (user && currentOrg) {
            fetchApprovals();
        }
    }, [user, currentOrg]);

    const fetchApprovals = async () => {
        try {
            const res = await fetch(`${GATEWAY_URL}/admin/org/${currentOrg?.tenant_id}/approvals`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            setApprovals(data.approvals || []);
        } catch (err) {
            console.error('Failed to fetch approvals', err);
        } finally {
            setLoading(false);
        }
    };

    const resolveApproval = async (id: string, status: 'approved' | 'rejected') => {
        setResolvingId(id);
        try {
            const res = await fetch(`${GATEWAY_URL}/admin/approvals/${id}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setApprovals(prev => prev.filter(a => a.id !== id));
            }
        } catch (err) {
            console.error('Failed to resolve approval', err);
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
            <div className="flex justify-between items-center border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                        HITL <span className="text-blue-500">Approvals</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">Revisa y autoriza acciones sensibles pausadas por el motor de políticas.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                        Node: {currentOrg?.name || 'Global'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-12 text-center glass rounded-3xl animate-pulse">
                        <span className="text-gray-500 font-bold uppercase tracking-widest">Sincronizando con el Ledger...</span>
                    </div>
                ) : approvals.length === 0 ? (
                    <div className="p-12 text-center glass rounded-3xl border border-dashed border-white/10 space-y-4">
                        <span className="text-4xl">✅</span>
                        <p className="text-gray-500 font-bold uppercase tracking-widest">No hay peticiones pendientes de aprobación.</p>
                    </div>
                ) : (
                    approvals.map(req => (
                        <div key={req.id} className="glass p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-12 h-12 bg-blue-600/20 rounded-xl border border-blue-500/20 flex items-center justify-center text-xl shadow-lg">
                                    ⚖️
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-white font-black tracking-tight uppercase text-sm">{req.id}</p>
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold uppercase">Pending Review</span>
                                    </div>
                                    <p className="text-[10px] font-mono text-gray-500 truncate max-w-xs">{req.envelope_hash}</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center md:items-end gap-1 px-8 border-x border-white/5">
                                <span className="text-[10px] font-bold text-gray-600 uppercase">Agent Entity</span>
                                <span className="text-xs text-blue-400 font-black italic">{req.agent_id || 'Unknown Agent'}</span>
                            </div>

                            <div className="text-center md:text-right px-8">
                                <span className="text-[10px] font-bold text-gray-600 uppercase">Timestamp</span>
                                <p className="text-xs text-white font-mono">{new Date(req.created_at).toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => resolveApproval(req.id, 'approved')}
                                    disabled={resolvingId === req.id}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => resolveApproval(req.id, 'rejected')}
                                    disabled={resolvingId === req.id}
                                    className="px-6 py-3 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-500/30 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="pt-8 text-center">
                <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase opacity-40">
                    AgentShield Governance Kernel // Human-In-The-Loop Enforcement
                </p>
            </div>
        </div>
    );
}
