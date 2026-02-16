'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { APIKeysTable } from '../../../components/APIKeysTable';
import Link from 'next/link';
import { QuickstartGenerator } from '../../../components/QuickstartGenerator';

export default function APIKeysPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchKeys = async () => {
        if (!user || !currentOrg) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/admin/api-keys/${currentOrg.tenant_id}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            setKeys(data.keys || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
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
                    API Access <span className="text-gray-600">Control</span>
                </h1>
            </div>

            <div className="space-y-2">
                <p className="text-sm text-gray-400 max-w-2xl">
                    Manage API keys for <strong>{currentOrg.name}</strong>. These keys allow programmatic access to the Financial MCP Gateway.
                </p>
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg flex gap-4 items-center">
                    <span className="text-2xl">🔒</span>
                    <div>
                        <p className="text-xs font-bold text-blue-300 uppercase">Security Note</p>
                        <p className="text-[10px] text-blue-400">Keys are hashed (SHA-256) on storage. Provide secrets to your developers only once.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Integration Snippet</h3>
                <QuickstartGenerator tenantId={currentOrg.tenant_id} />
            </div>

            {loading ? (
                <div className="text-gray-500 font-mono text-xs">Loading keys...</div>
            ) : (
                <APIKeysTable tenantId={currentOrg.tenant_id} keys={keys} onRefresh={fetchKeys} />
            )}
        </div>
    );
}
