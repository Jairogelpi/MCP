'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { Playground } from '../../../components/Playground';
import Link from 'next/link';

export default function PlaygroundPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();
    const [upstreams, setUpstreams] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && currentOrg) {
            setLoading(true);
            fetch(`http://localhost:3000/admin/org/${currentOrg.tenant_id}/upstreams`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            })
                .then(res => res.json())
                .then(data => {
                    setUpstreams(data.upstreams || []);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [user, currentOrg]);

    if (!currentOrg) {
        return (
            <div className="p-12 text-center">
                <p className="text-gray-500">Please select an organization to test.</p>
                <Link href="/dashboard" className="text-blue-400 hover:text-white mt-4 inline-block">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col p-6 max-w-[1920px] mx-auto overflow-hidden">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-6 shrink-0">
                <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors">← Back</Link>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Contract <span className="text-purple-500">Playground</span>
                </h1>
                <div className="ml-auto px-3 py-1 bg-white/5 rounded border border-white/10 text-[10px] font-mono text-gray-400">
                    Tenant: <span className="text-white font-bold">{currentOrg.name}</span>
                </div>
            </div>

            {loading ? (
                <div className="text-gray-500 font-mono text-xs">Loading context...</div>
            ) : upstreams.length === 0 ? (
                <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
                    <p className="text-gray-400 mb-4">No upstreams configured for this organization.</p>
                    <Link href="/dashboard/upstreams" className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase">Configure Upstream</Link>
                </div>
            ) : (
                <Playground tenantId={currentOrg.tenant_id} upstreams={upstreams} apiKeys={[]} />
            )}
        </div>
    );
}
