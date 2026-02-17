'use client';

import React, { useState } from 'react';
import { useAuth } from '../app/context/AuthContext';
import { GATEWAY_URL } from '../lib/config';
import Link from 'next/link';
import { AgentControls } from './AgentControls';

interface Agent {
    id: string;
    name: string;
    role_id: string;
    description: string;
    created_at: number;
    governance?: {
        mode: string;
    };
}

interface Props {
    tenantId: string;
    agents: Agent[];
    onRefresh: () => void;
}

export function AgentsTable({ tenantId, agents, onRefresh }: Props) {
    const { user } = useAuth();
    const [creating, setCreating] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [roleId, setRoleId] = useState('role_operator');
    const [description, setDescription] = useState('');
    const [governingAgent, setGoverningAgent] = useState<{ id: string, name: string } | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch(`${GATEWAY_URL}/admin/agents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    tenantId,
                    name,
                    roleId,
                    description
                })
            });

            if (res.ok) {
                setName('');
                setDescription('');
                setRoleId('role_operator');
                onRefresh();
                setCreating(false);
            }
        } catch (err) {
            alert('Failed to initialize entity');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Decommission this agent entity? All linked keys will remain active but lose agent-specific context.')) return;
        try {
            await fetch(`${GATEWAY_URL}/admin/agents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            onRefresh();
        } catch (err) {
            alert('Decommission failed');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
                <div onClick={() => setCreating(!creating)} className="flex justify-between items-center cursor-pointer group">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">
                        Deploy New Agent <span className="text-gray-600">Entity</span>
                    </h3>
                    <button className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center font-bold text-xl transition-all ${creating ? 'bg-red-500/20 text-red-400 rotate-45' : 'bg-blue-500/20 text-blue-400'}`}>
                        +
                    </button>
                </div>

                {creating && (
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Agent Identity Name</label>
                            <input
                                className="input-premium"
                                placeholder="e.g. Finance GPT v4"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Primary Behavioral Role</label>
                            <select
                                className="input-premium bg-[#0a0c10]"
                                value={roleId}
                                onChange={e => setRoleId(e.target.value)}
                            >
                                <option value="role_operator">Operator (Full Control)</option>
                                <option value="role_viewer">Viewer (Read Only)</option>
                                <option value="role_admin">Entity Admin</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Mission Description</label>
                            <input
                                className="input-premium"
                                placeholder="Purposes and limitations of this agent..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-12 rounded-2xl uppercase italic tracking-tighter transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                Initialize & Secure
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="glass overflow-hidden rounded-3xl border border-white/5 backdrop-blur-3xl">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 text-[10px] uppercase tracking-[0.2em] font-black border-b border-white/5">
                        <tr>
                            <th className="p-6">Agent Entity</th>
                            <th className="p-6">ID Context</th>
                            <th className="p-6">Role Mapping</th>
                            <th className="p-6">Security Mode</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                        {agents.map(ag => (
                            <tr key={ag.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-xs grayscale group-hover:grayscale-0 transition-all border border-blue-500/20">
                                            🤖
                                        </div>
                                        <span className="font-bold text-white uppercase tracking-tight italic">{ag.name}</span>
                                    </div>
                                    {ag.description && <p className="text-[10px] text-gray-600 mt-1 pl-12">{ag.description}</p>}
                                </td>
                                <td className="p-6 text-[10px] text-blue-300 font-bold">{ag.id}</td>
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${ag.role_id === 'role_admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                        ag.role_id === 'role_operator' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                            'bg-gray-800 text-gray-400 border-white/5'
                                        }`}>
                                        {ag.role_id.replace('role_', '')}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border ${ag.governance?.mode === 'high_security' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        ag.governance?.mode === 'strict' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                            ag.governance?.mode === 'budget' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                        {ag.governance?.mode || 'OPEN'}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        <span className="text-[10px] text-emerald-400 font-black uppercase">Active</span>
                                    </div>
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setGoverningAgent({ id: ag.id, name: ag.name })}
                                            className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border border-blue-500/20 active:scale-95"
                                        >
                                            Governance
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ag.id)}
                                            className="text-gray-700 hover:text-red-400 px-3 py-1 rounded text-[10px] font-black uppercase transition-all border border-transparent hover:border-red-500/20"
                                        >
                                            Decommission
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {agents.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-16 text-center text-gray-600 uppercase text-[10px] tracking-[0.5em] font-black italic">
                                    No Agent Entities Pooled
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {governingAgent && (
                <AgentControls
                    agentId={governingAgent.id}
                    agentName={governingAgent.name}
                    token={user?.token || ''}
                    onClose={() => setGoverningAgent(null)}
                />
            )}

            <div className="bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-2xl flex gap-6 items-center">
                <span className="text-3xl">🔑</span>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Key Integration Hub</p>
                    <p className="text-xs text-indigo-300 italic">
                        Tip: Go to <Link href="/dashboard/api-keys" className="underline hover:text-white">API Keys</Link> and select an agent during creation to link an autonomous secret to an identity above.
                    </p>
                </div>
            </div>
        </div>
    );
}
