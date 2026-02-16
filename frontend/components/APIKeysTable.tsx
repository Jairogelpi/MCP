'use client';

import React, { useState } from 'react';
import { useAuth } from '../app/context/AuthContext';

interface APIKey {
    key_id: string;
    deployment_name: string;
    environment: string;
    scopes: string;
    status: 'active' | 'revoked' | 'rotated';
    expires_at: number;
    created_at: number;
}

interface Props {
    tenantId: string;
    keys: APIKey[];
    onRefresh: () => void;
}

export function APIKeysTable({ tenantId, keys, onRefresh }: Props) {
    const { user } = useAuth();
    const [creating, setCreating] = useState(false);
    const [newKeySecret, setNewKeySecret] = useState<string | null>(null);

    const handleCreateKey = async () => {
        if (!confirm('Create a new API Key for this organization?')) return;
        setCreating(true);
        try {
            const res = await fetch('http://localhost:3000/admin/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ tenantId })
            });
            const data = await res.json();
            if (data.secret) {
                setNewKeySecret(data.secret);
                onRefresh();
            }
        } catch (err) {
            alert('Failed to create key');
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (keyId: string) => {
        if (!confirm('Are you sure you want to revoke this key?')) return;
        try {
            await fetch(`http://localhost:3000/admin/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            onRefresh();
        } catch (err) {
            alert('Failed to revoke key');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Credenciales de Acceso</h3>
                <button
                    onClick={handleCreateKey}
                    disabled={creating}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                    {creating ? 'Generando...' : '+ Nueva Key'}
                </button>
            </div>

            {newKeySecret && (
                <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-xl space-y-2">
                    <p className="text-emerald-400 text-xs font-bold uppercase">¡Key Generada con éxito!</p>
                    <p className="text-gray-400 text-[10px]">Copia este secreto ahora. No podrás verlo de nuevo.</p>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-black/50 p-3 rounded font-mono text-emerald-300 text-sm break-all">
                            {newKeySecret}
                        </code>
                        <button
                            onClick={() => { navigator.clipboard.writeText(newKeySecret); alert('Copied!'); }}
                            className="bg-emerald-600/20 text-emerald-400 px-3 rounded hover:bg-emerald-600/40"
                        >
                            COPY
                        </button>
                        <button onClick={() => setNewKeySecret(null)} className="text-gray-500 hover:text-white px-2">
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="glass overflow-hidden rounded-xl border border-white/5">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 text-[10px] uppercase tracking-widest font-bold">
                        <tr>
                            <th className="p-4">Key ID</th>
                            <th className="p-4">Environment</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Created At</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {keys.map(key => (
                            <tr key={key.key_id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-mono text-gray-300">{key.key_id}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${key.environment === 'prod' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'}`}>
                                        {key.environment || 'Global'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${key.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                            key.status === 'revoked' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {key.status}
                                    </span>
                                </td>
                                <td className="p-4 text-xs font-mono">{new Date(key.created_at).toLocaleDateString()}</td>
                                <td className="p-4 text-right space-x-2">
                                    {key.status === 'active' && (
                                        <button
                                            onClick={() => handleRevoke(key.key_id)}
                                            className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase border border-red-500/20 px-2 py-1 rounded hover:bg-red-500/10"
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {keys.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-600 uppercase text-xs tracking-widest">
                                    No active keys found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
