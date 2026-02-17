'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { AgentsTable } from '../../../components/AgentsTable';
import { GATEWAY_URL } from '../../../lib/config';
import Link from 'next/link';

export default function AgentsPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAgents = async () => {
        if (!user || !currentOrg) return;
        setLoading(true);
        try {
            const res = await fetch(`${GATEWAY_URL}/admin/org/${currentOrg.tenant_id}/agents`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && currentOrg) {
            fetchAgents();
        }
    }, [user, currentOrg]);

    if (!currentOrg) {
        return (
            <div className="p-12 text-center">
                <p className="text-gray-500 font-mono uppercase text-xs tracking-[0.2em]">Access Denied // Select Organization</p>
                <Link href="/dashboard" className="text-blue-400 hover:text-white mt-4 inline-block font-bold uppercase text-[10px] tracking-widest border border-blue-500/20 px-4 py-2 rounded-lg">
                    Return to Command
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="text-gray-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10">
                        ←
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            Agent <span className="text-gray-600">Entities</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-mono mt-1">Autonomous Identity Management // {currentOrg.name}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
                    <div className="text-2xl">🤖</div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Entities</h3>
                    <p className="text-4xl font-black text-white italic">{agents.length}</p>
                    <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest leading-relaxed">
                        Non-human identities configured with specific behavioral roles.
                    </p>
                </div>

                <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 md:col-span-2">
                    <div className="text-2xl">⚖️</div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Governance Context</h3>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-lg font-mono uppercase tracking-wider">
                        Each agent operates under a specific Role (Operator, Viewer, Admin) which determines their available functional scopes.
                        Policies can be targeted specifically to these Entity IDs.
                    </p>
                    <div className="flex gap-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] text-emerald-500 uppercase font-black">IAM Sync: OK</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <span className="text-[10px] uppercase font-black">Version: 2.1-Ag</span>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-4 text-gray-500 font-mono text-xs uppercase tracking-widest py-12">
                    <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                    Resolving Entity Pool...
                </div>
            ) : (
                <AgentsTable tenantId={currentOrg.tenant_id} agents={agents} onRefresh={fetchAgents} />
            )}
        </div>
    );
}
