'use client';

import React, { useState } from 'react';
import { useAuth } from '../app/context/AuthContext';

interface Upstream {
    id: string;
    name: string;
    base_url: string;
    auth_type: string;
    created_at: number;
}

interface Props {
    tenantId: string;
    upstreams: Upstream[];
    onRefresh: () => void;
}

export function UpstreamsTable({ tenantId, upstreams, onRefresh }: Props) {
    const { user } = useAuth();
    const [creating, setCreating] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [authType, setAuthType] = useState('none');
    const [transport, setTransport] = useState('http'); // New: Transport selection
    const [token, setToken] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await fetch('http://localhost:3000/admin/upstreams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    tenantId,
                    name,
                    baseUrl,
                    authType,
                    // Send transport and authConfig (simplified for now as just token or empty)
                    transport,
                    authConfig: token ? { token } : {}
                })
            });
            // Reset form
            setName('');
            setBaseUrl('');
            setAuthType('none');
            setTransport('http');
            setToken('');

            onRefresh();
            setCreating(false);
        } catch (err) {
            alert('Failed to create upstream');
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this upstream? It will break any routes using it.')) return;
        try {
            await fetch(`http://localhost:3000/admin/upstreams/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            onRefresh();
        } catch (err) {
            alert('Failed to delete upstream');
        }
    };

    return (
        <div className="space-y-8">
            <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                <div onClick={() => setCreating(!creating)} className="flex justify-between items-center cursor-pointer">
                    <h3 className="text-lg font-bold text-white uppercase italic tracking-tighter">Register New Upstream</h3>
                    <button className="text-blue-400 font-bold text-xl">{creating ? '-' : '+'}</button>
                </div>

                {creating && (
                    <form onSubmit={handleCreate} className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Service Name</label>
                                <input
                                    className="input-premium w-full"
                                    placeholder="e.g. Payment Provider A"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Base URL</label>
                                <input
                                    className="input-premium w-full"
                                    placeholder="https://api.provider.com"
                                    value={baseUrl}
                                    onChange={e => setBaseUrl(e.target.value)}
                                    required
                                />
                            </div>

                            {/* New: Transport Selection */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Transport</label>
                                <select
                                    className="input-premium w-full bg-[#0a0c10]"
                                    value={transport}
                                    onChange={e => setTransport(e.target.value)}
                                >
                                    <option value="http">HTTP (Standard)</option>
                                    <option value="sse">SSE (Streaming)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Auth Type</label>
                                <select
                                    className="input-premium w-full bg-[#0a0c10]"
                                    value={authType}
                                    onChange={e => setAuthType(e.target.value)}
                                >
                                    <option value="none">None (Public)</option>
                                    <option value="bearer">Bearer Token</option>
                                    <option value="api_key">API Key (Header)</option>
                                </select>
                            </div>
                            {authType !== 'none' && (
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Secret Token/Key</label>
                                    <input
                                        type="password"
                                        className="input-premium w-full"
                                        placeholder="sk_live_..."
                                        value={token}
                                        onChange={e => setToken(e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Stored securely. Will be sent in Authorization header or x-api-key based on type.</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-blue-500/20">
                                Connect Upstream
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="glass overflow-hidden rounded-xl border border-white/5">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 text-[10px] uppercase tracking-widest font-bold">
                        <tr>
                            <th className="p-4">Service Name</th>
                            <th className="p-4">Base URL</th>
                            <th className="p-4">Transport</th>
                            <th className="p-4">Auth</th>
                            <th className="p-4">Created</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {upstreams.map(up => (
                            <tr key={up.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold text-white">{up.name}</td>
                                <td className="p-4 font-mono text-xs text-blue-300">{up.base_url}</td>
                                <td className="p-4">
                                    {/* Mocking transport display for now as backend might not return it in list yet, 
                                         but good to have column ready. Assuming 'http' default if missing */}
                                    <span className="text-[10px] uppercase font-bold text-gray-500">HTTP</span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border border-white/5 ${up.auth_type === 'none' ? 'bg-gray-800 text-gray-400' : 'bg-purple-900/40 text-purple-300'}`}>
                                        {up.auth_type}
                                    </span>
                                </td>
                                <td className="p-4 text-xs font-mono">{new Date(up.created_at).toLocaleDateString()}</td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleDelete(up.id)}
                                        className="text-red-400 hover:text-white hover:bg-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {upstreams.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-600 uppercase text-xs tracking-widest">
                                    No upstreams configured
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
