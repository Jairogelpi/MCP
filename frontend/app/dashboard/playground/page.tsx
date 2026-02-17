'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { Playground } from '../../../components/Playground';
import { GATEWAY_URL } from '../../../lib/config';
import Link from 'next/link';

export default function PlaygroundPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();
    const [upstreams, setUpstreams] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && currentOrg) {
            setLoading(true);
            Promise.all([
                fetch(`${GATEWAY_URL}/admin/org/${currentOrg.tenant_id}/upstreams`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json()),
                fetch(`${GATEWAY_URL}/admin/api-keys/${currentOrg.tenant_id}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json())
            ])
                .then(([upData, keyData]) => {
                    setUpstreams(upData.upstreams || []);
                    setApiKeys(keyData.keys || []);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [user, currentOrg]);

    const handleBootstrap = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${GATEWAY_URL}/admin/bootstrap`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                window.location.reload();
            }
        } catch (err) {
            console.error('Bootstrap failed', err);
        } finally {
            setLoading(false);
        }
    };

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
                <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
                    <div className="animate-pulse">Synthesizing environment...</div>
                </div>
            ) : upstreams.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-blue-500/20 rounded-3xl text-center bg-blue-600/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl">✨</div>
                    <div className="max-w-md space-y-6 relative z-10">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">🚀</span>
                        </div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Your Gateway is Ready</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            We've prepared a secure sandbox with a <span className="text-blue-400 font-bold">Mirror Upstream</span> and your first <span className="text-emerald-400 font-bold">API Key</span>.
                            Experiment with your first request in seconds.
                        </p>
                        <div className="pt-4">
                            <button
                                onClick={handleBootstrap}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-3 mx-auto"
                            >
                                Enter Discovery Lab ⚡
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">End-to-end setup completed in background</p>
                    </div>
                </div>
            ) : (
                <Playground tenantId={currentOrg.tenant_id} upstreams={upstreams} apiKeys={apiKeys} />
            )}
        </div>
    );
}
