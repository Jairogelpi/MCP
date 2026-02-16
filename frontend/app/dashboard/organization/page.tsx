'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import Link from 'next/link';

interface Member {
    user_id: string;
    name: string;
    email: string;
    role_id: string;
    status: string;
    joined_at: number;
}

interface Deployment {
    id: string;
    name: string;
    environment: 'prod' | 'staging' | 'dev';
    created_at: number;
}

interface ApiKey {
    key_id: string;
    user_id: string;
    scopes: string;
    status: string;
    expires_at: number;
    created_at: number;
    deployment_name?: string;
    environment?: string;
}

interface Upstream {
    id: string;
    name: string;
    base_url: string;
    auth_type: string;
    created_at: number;
}

export default function OrganizationManagementPage() {
    const { user } = useAuth();
    const { currentOrg, fetchOrganizations } = useOrganization();

    const [members, setMembers] = useState<Member[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [loading, setLoading] = useState(true);

    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    // Key Generation State
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
    const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>('');

    // Deployment Creation State
    const [newDepName, setNewDepName] = useState('');
    const [newDepEnv, setNewDepEnv] = useState('dev');
    const [isCreatingDep, setIsCreatingDep] = useState(false);
    const [showDepModal, setShowDepModal] = useState(false);

    const [orgName, setOrgName] = useState(currentOrg?.name || '');
    const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

    // Upstream State
    const [upstreams, setUpstreams] = useState<Upstream[]>([]);
    const [newUpstreamName, setNewUpstreamName] = useState('');
    const [newUpstreamUrl, setNewUpstreamUrl] = useState('');
    const [isCreatingUpstream, setIsCreatingUpstream] = useState(false);
    const [showUpstreamModal, setShowUpstreamModal] = useState(false);

    useEffect(() => {
        if (currentOrg) {
            setOrgName(currentOrg.name);
            fetchData();
        }
    }, [user, currentOrg]);

    const fetchData = async () => {
        if (!currentOrg || !user) return;
        setLoading(true);
        try {
            const [membersRes, keysRes, depsRes, upsRes] = await Promise.all([
                fetch(`http://localhost:3000/admin/org/members/${currentOrg.tenant_id}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch(`http://localhost:3000/admin/api-keys/${currentOrg.tenant_id}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch(`http://localhost:3000/admin/org/${currentOrg.tenant_id}/deployments`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch(`http://localhost:3000/admin/org/${currentOrg.tenant_id}/upstreams`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
            ]);

            const membersData = await membersRes.json();
            const keysData = await keysRes.json();
            const depsData = await depsRes.json();
            const upsData = await upsRes.json();

            setMembers(membersData.members || []);
            setApiKeys(keysData.keys || []);
            setDeployments(depsData.deployments || []);
            setUpstreams(upsData.upstreams || []);

            // Set default deployment if available (prefer prod, then first)
            if (depsData.deployments?.length > 0 && !selectedDeploymentId) {
                const prod = depsData.deployments.find((d: any) => d.environment === 'prod');
                setSelectedDeploymentId(prod ? prod.id : depsData.deployments[0].id);
            }

        } catch (err) {
            console.error('Failed to fetch org data', err);
        } finally {
            setLoading(false);
        }
    };

    const createDeployment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg || !user) return;
        setIsCreatingDep(true);
        try {
            await fetch('http://localhost:3000/admin/deployments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    tenantId: currentOrg.tenant_id,
                    name: newDepName,
                    environment: newDepEnv
                })
            });
            setShowDepModal(false);
            setNewDepName('');
            fetchData();
        } catch (err) {
            console.error('Failed to create deployment', err);
        } finally {
            setIsCreatingDep(false);
        }
    };

    const createUpstream = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg || !user) return;
        setIsCreatingUpstream(true);
        try {
            await fetch('http://localhost:3000/admin/upstreams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    tenantId: currentOrg.tenant_id,
                    name: newUpstreamName,
                    baseUrl: newUpstreamUrl,
                    authType: 'none', // For Phase 10 MVP
                })
            });
            setShowUpstreamModal(false);
            setNewUpstreamName('');
            setNewUpstreamUrl('');
            fetchData();
        } catch (err) {
            console.error('Failed to create upstream', err);
        } finally {
            setIsCreatingUpstream(false);
        }
    };

    const deleteUpstream = async (id: string) => {
        if (!user || !confirm('¿Eliminar esta conexión upstream?')) return;
        try {
            await fetch(`http://localhost:3000/admin/upstreams/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            fetchData();
        } catch (err) {
            console.error('Failed to delete upstream', err);
        }
    };

    const generateKey = async () => {
        if (!currentOrg || !user || !selectedDeploymentId) return;
        setIsGeneratingKey(true);
        try {
            const res = await fetch('http://localhost:3000/admin/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    userId: user.userId,
                    tenantId: currentOrg.tenant_id,
                    deploymentId: selectedDeploymentId,
                    scopes: '*',
                    expiresDays: 90
                })
            });
            const data = await res.json();
            if (data.secret) {
                setGeneratedSecret(data.secret);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to generate key', err);
        } finally {
            setIsGeneratingKey(false);
        }
    };

    const revokeKey = async (keyId: string) => {
        if (!user) return;
        if (!confirm('¿Estás seguro de revocar esta API Key? Esta acción es irreversible.')) return;

        try {
            await fetch(`http://localhost:3000/admin/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            fetchData();
        } catch (err) {
            console.error('Failed to revoke key', err);
        }
    };

    const updateOrgSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg || !user) return;
        setIsUpdatingOrg(true);
        try {
            await fetch(`http://localhost:3000/admin/org/${currentOrg.tenant_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ name: orgName })
            });
            await fetchOrganizations();
            alert('Configuración actualizada');
        } catch (err) {
            console.error('Failed to update org', err);
        } finally {
            setIsUpdatingOrg(false);
        }
    };

    // Group Keys by Deployment
    const keysByDeployment = deployments.map(dep => ({
        ...dep,
        keys: apiKeys.filter(k => k.deployment_name === dep.name || (!k.deployment_name && dep.environment === 'prod')) // heuristic for legacy keys
    }));

    if (loading && members.length === 0) {
        return (
            <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter border border-blue-500/30">Zero-Friction</span>
                        <span className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">{currentOrg?.name}</span>
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                        Deployments <span className="text-blue-500">& Keys</span>
                    </h1>
                </div>
                <Link href="/dashboard" className="text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5">
                    ← Dashboard
                </Link>
            </div>

            {/* API Key Modal (Secret Display) */}
            {generatedSecret && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="glass p-8 rounded-3xl w-full max-w-2xl space-y-6 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
                        <div className="relative z-10 text-center space-y-2">
                            <span className="text-4xl block mb-4">🚀</span>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Deployment Key Ready</h3>
                            <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Credencial lista para su uso en producción.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-black/80 p-6 rounded-2xl border border-emerald-500/20 font-mono text-sm relative group">
                                <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest">AgentShield-Key</p>
                                <div className="flex items-center justify-between text-emerald-400 break-all">
                                    {generatedSecret}
                                    <span className="text-xs bg-emerald-900/50 px-2 py-1 rounded ml-2">COPY</span>
                                </div>
                            </div>

                            <div className="glass-light p-6 rounded-2xl border border-white/5 font-mono text-xs">
                                <p className="text-gray-400 mb-2 font-bold uppercase tracking-widest">Quickstart Integration</p>
                                <code className="block text-blue-300">
                                    curl -X POST https://api.agentshield.io/v1/gateway \<br />
                                    &nbsp;&nbsp;-H "Authorization: Bearer {generatedSecret.substring(0, 15)}..." \<br />
                                    &nbsp;&nbsp;-d '{"{"}"agent": "my-agent", "input": "Hello"{"}"}'
                                </code>
                            </div>
                        </div>

                        <button
                            onClick={() => setGeneratedSecret(null)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase italic tracking-tighter transition-all"
                        >
                            Confirmar y Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* New Deployment Modal */}
            {showDepModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="glass p-8 rounded-3xl w-full max-w-md space-y-6 border border-white/10">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">New Deployment</h3>
                        <form onSubmit={createDeployment} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Deployment Name</label>
                                <input
                                    type="text"
                                    value={newDepName}
                                    onChange={(e) => setNewDepName(e.target.value)}
                                    placeholder="e.g. Staging V2"
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Environment</label>
                                <select
                                    value={newDepEnv}
                                    onChange={(e) => setNewDepEnv(e.target.value)}
                                    className="input-premium appearance-none bg-[#0f111a]"
                                >
                                    <option value="dev">Development</option>
                                    <option value="staging">Staging</option>
                                    <option value="prod">Production</option>
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDepModal(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-xl uppercase text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingDep}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl uppercase text-xs shadow-lg shadow-indigo-500/20"
                                >
                                    {isCreatingDep ? 'Creating...' : 'Launch Env'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* New Upstream Modal */}
            {showUpstreamModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="glass p-8 rounded-3xl w-full max-w-md space-y-6 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Connect Upstream</h3>
                        <form onSubmit={createUpstream} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Server Name</label>
                                <input
                                    type="text"
                                    value={newUpstreamName}
                                    onChange={(e) => setNewUpstreamName(e.target.value)}
                                    placeholder="e.g. Finance Core"
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Base URL</label>
                                <input
                                    type="url"
                                    value={newUpstreamUrl}
                                    onChange={(e) => setNewUpstreamUrl(e.target.value)}
                                    placeholder="http://localhost:3001"
                                    className="input-premium font-mono text-xs"
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUpstreamModal(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-xl uppercase text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingUpstream}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl uppercase text-xs shadow-lg shadow-emerald-500/20"
                                >
                                    {isCreatingUpstream ? 'Connecting...' : 'Link Server'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                {/* Left Column: Organization & Deployments Control */}
                <div className="space-y-8">
                    {/* Deployments List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Environments</h3>
                            <button
                                onClick={() => setShowDepModal(true)}
                                className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-500/20 uppercase tracking-widest hover:bg-indigo-600 transition-all"
                            >
                                + New
                            </button>
                        </div>

                        <div className="space-y-3">
                            {deployments.map(dep => (
                                <div key={dep.id}
                                    onClick={() => setSelectedDeploymentId(dep.id)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedDeploymentId === dep.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'glass border-white/5 hover:border-white/10'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${dep.environment === 'prod' ? 'bg-red-500' : dep.environment === 'staging' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></span>
                                            <span className="font-bold text-sm text-white">{dep.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-500 uppercase">{dep.environment}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 font-mono">{dep.id}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upstreams List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Upstreams</h3>
                            <button
                                onClick={() => setShowUpstreamModal(true)}
                                className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-widest hover:bg-emerald-600 transition-all"
                            >
                                + Connect
                            </button>
                        </div>

                        <div className="space-y-3">
                            {upstreams.length === 0 && (
                                <div className="p-4 rounded-2xl glass border border-dashed border-white/10 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase">No connections</p>
                                </div>
                            )}
                            {upstreams.map(up => (
                                <div key={up.id} className="p-4 rounded-2xl glass border border-white/5 hover:border-emerald-500/30 transition-all group relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="font-bold text-sm text-white">{up.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-500 uppercase">{up.auth_type}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 font-mono truncate">{up.base_url}</p>
                                    <button
                                        onClick={() => deleteUpstream(up.id)}
                                        className="absolute top-2 right-2 p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded-lg text-[10px]"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Org Settings */}
                    <div className="glass p-8 rounded-3xl space-y-6">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Org Profile</h3>
                        <form onSubmit={updateOrgSettings} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Entity Name</label>
                                <input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isUpdatingOrg}
                                className="w-full glass-light text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white font-black py-3 rounded-2xl uppercase italic tracking-tighter transition-all"
                            >
                                {isUpdatingOrg ? 'Syncing...' : 'Update Settings'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Key Management for Selected Deployment */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-indigo-500/40 decoration-4 underline-offset-8">
                            Active Keys
                        </h2>
                        <button
                            onClick={generateKey}
                            disabled={!selectedDeploymentId || isGeneratingKey}
                            className="bg-white/5 text-xs font-bold text-indigo-400 hover:text-white px-6 py-3 rounded-xl border border-indigo-500/20 hover:bg-indigo-600 transition-all uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingKey ? 'Minting...' : '+ Generate Deployment Key'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {keysByDeployment.find(d => d.id === selectedDeploymentId)?.keys.length === 0 && (
                            <div className="glass p-12 text-center rounded-3xl border border-dashed border-white/10 text-gray-600 space-y-2">
                                <p className="font-bold uppercase tracking-widest">No Keys Found</p>
                                <p className="text-xs">Select a deployment on the left and generate a key.</p>
                            </div>
                        )}

                        {keysByDeployment.find(d => d.id === selectedDeploymentId)?.keys.map((key) => (
                            <div key={key.key_id} className="glass p-6 rounded-2xl flex items-center justify-between gap-6 border border-white/5 group hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 font-black text-xs shadow-[0_0_15px_rgba(99,102,241,0.1)]">KEY</div>
                                    <div>
                                        <p className="text-white font-mono text-sm tracking-tight mb-1">{key.key_id}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Scope: {key.scopes || '*'}</span>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Env: {key.environment || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-[10px] font-mono text-gray-500">Exp: {new Date(key.expires_at).toLocaleDateString()}</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${key.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{key.status}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => revokeKey(key.key_id)}
                                        className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
