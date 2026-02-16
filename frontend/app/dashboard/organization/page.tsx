'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Member {
    user_id: string;
    name: string;
    email: string;
    role_id: string;
    status: string;
    joined_at: number;
}

interface ApiKey {
    key_id: string;
    user_id: string;
    scopes: string;
    status: string;
    expires_at: number;
    created_at: number;
}

export default function OrganizationManagementPage() {
    const { user } = useAuth();
    const { currentOrg, fetchOrganizations } = useOrganization();
    const router = useRouter();

    const [members, setMembers] = useState<Member[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);

    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

    const [orgName, setOrgName] = useState(currentOrg?.name || '');
    const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

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
            const [membersRes, keysRes] = await Promise.all([
                fetch(`http://localhost:3000/admin/org/members/${currentOrg.tenant_id}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch(`http://localhost:3000/admin/api-keys/${currentOrg.tenant_id}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
            ]);

            const membersData = await membersRes.json();
            const keysData = await keysRes.json();

            setMembers(membersData.members || []);
            setApiKeys(keysData.keys || []);
        } catch (err) {
            console.error('Failed to fetch org data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        // Simulate invite
        setTimeout(() => {
            alert(`Invitación enviada a ${inviteEmail}`);
            setInviteEmail('');
            setIsInviting(false);
        }, 1000);
    };

    const generateKey = async () => {
        if (!currentOrg || !user) return;
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
                        <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter border border-blue-500/30">IAM & Organization</span>
                        <span className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">{currentOrg?.name}</span>
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                        ACCESS <span className="text-blue-500">CONTROL</span>
                    </h1>
                </div>
                <Link href="/dashboard" className="text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5">
                    ← Dashboard
                </Link>
            </div>

            {/* API Key Modal (Secret Display) */}
            {generatedSecret && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="glass p-8 rounded-3xl w-full max-w-lg space-y-6 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10">
                        <div className="text-center space-y-2">
                            <span className="text-3xl">🔐</span>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">API Key Generada</h3>
                            <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Guarda este secreto ahora. No se volverá a mostrar.</p>
                        </div>

                        <div className="bg-black/50 p-6 rounded-2xl border border-white/5 font-mono break-all text-sm text-center select-all">
                            {generatedSecret}
                        </div>

                        <button
                            onClick={() => setGeneratedSecret(null)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase italic tracking-tighter transition-all"
                        >
                            He Copiado el Secreto
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                {/* Left Column: Settings & Invite */}
                <div className="space-y-8">
                    {/* Org Settings */}
                    <div className="glass p-8 rounded-3xl space-y-6">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Organization Profile</h3>
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
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Status</label>
                                <div className="text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 inline-block uppercase">
                                    {currentOrg?.status || 'Active'}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isUpdatingOrg}
                                className="w-full glass-light text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white font-black py-3 rounded-2xl uppercase italic tracking-tighter transition-all"
                            >
                                {isUpdatingOrg ? 'Sincronizando...' : 'Update Settings'}
                            </button>
                        </form>
                    </div>

                    {/* Invite Section */}
                    <div className="glass p-8 rounded-3xl space-y-6">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Invite Member</h3>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="agent@cyberdyne.io"
                                className="input-premium"
                                required
                            />
                            <select className="input-premium appearance-none bg-[#0f111a]">
                                <option value="role_viewer">Viewer</option>
                                <option value="role_operator">Operator</option>
                                <option value="role_admin">Admin</option>
                            </select>
                            <button
                                type="submit"
                                disabled={isInviting}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl uppercase italic tracking-tighter transition-all shadow-lg"
                            >
                                {isInviting ? 'Enviando...' : 'Deploy Invite'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right/Middle Column: API Keys & Members */}
                <div className="xl:col-span-2 space-y-12">
                    {/* API Keys Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-blue-500/40 decoration-4 underline-offset-8">API Credentials</h2>
                            <button
                                onClick={generateKey}
                                disabled={isGeneratingKey}
                                className="bg-white/5 text-xs font-bold text-blue-400 hover:text-white px-4 py-2 rounded-xl border border-blue-500/20 hover:bg-blue-600 transition-all uppercase tracking-widest"
                            >
                                {isGeneratingKey ? 'Generating...' : '+ Generate API Key'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {apiKeys.length === 0 && (
                                <div className="glass p-12 text-center rounded-3xl border border-dashed border-white/10 text-gray-600 font-bold uppercase tracking-widest">
                                    No hay credenciales activas. Genera una para empezar.
                                </div>
                            )}
                            {apiKeys.map((key) => (
                                <div key={key.key_id} className="glass p-6 rounded-2xl flex items-center justify-between gap-6 border border-white/5 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 font-bold text-[10px]">KEY</div>
                                        <div>
                                            <p className="text-white font-mono text-xs">{key.key_id}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scopes: {key.scopes || '*'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] font-mono text-gray-500">Expira: {new Date(key.expires_at).toLocaleDateString()}</p>
                                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{key.status}</p>
                                        </div>
                                        <button
                                            onClick={() => revokeKey(key.key_id)}
                                            className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Members List */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-blue-500/40 decoration-4 underline-offset-8">Entity Members</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {members.map((member) => (
                                <div key={member.user_id} className="glass p-6 rounded-2xl flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">👤</div>
                                        <div>
                                            <p className="text-white font-bold tracking-tight">{member.name}</p>
                                            <p className="text-[10px] font-mono text-gray-600 lowercase">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{member.role_id.replace('role_', '')}</p>
                                        <p className="text-[10px] font-mono text-gray-600 italic">Member since {new Date(member.joined_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
