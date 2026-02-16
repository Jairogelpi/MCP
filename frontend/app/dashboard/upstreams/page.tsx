'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { UpstreamsTable } from '../../../components/UpstreamsTable';
import Link from 'next/link';

export default function UpstreamsPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();
    const [upstreams, setUpstreams] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchUpstreams = async () => {
        if (!user || !currentOrg) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/admin/org/${currentOrg.tenant_id}/upstreams`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            setUpstreams(data.upstreams || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUpstreams();
    }, [user, currentOrg]);

    if (!currentOrg) {
        return (
            <div className="p-12 text-center">
                <p className="text-gray-500">Please select an organization first.</p>
                <Link href="/dashboard" className="text-blue-400 hover:text-white mt-4 inline-block">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors">← Back</Link>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Upstream <span className="text-gray-600">Connectivity</span>
                </h1>
            </div>

            <div className="space-y-2">
                <p className="text-sm text-gray-400 max-w-2xl">
                    Configure external MCP servers and APIs that <strong>{currentOrg.name}</strong> can route traffic to.
                </p>
                <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-lg flex gap-4 items-center">
                    <span className="text-2xl">📡</span>
                    <div>
                        <p className="text-xs font-bold text-purple-300 uppercase">Routing Logic</p>
                        <p className="text-[10px] text-purple-400">Traffic is routed based on <code>/mcp/&#123;tenant&#125;/&#123;upstream_name&#125;</code> requests.</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-gray-500 font-mono text-xs">Loading services...</div>
            ) : (
                <UpstreamsTable tenantId={currentOrg.tenant_id} upstreams={upstreams} onRefresh={fetchUpstreams} />
            )}
        </div>
    );
}
