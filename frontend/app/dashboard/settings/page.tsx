'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ToolSetting {
    tool_name: string;
    provider: string;
    model: string;
    tier: string;
    estimated_tokens_out: number;
    is_active: number;
    tenant_id: string | null;
}

export default function SettingsPage() {
    const { user } = useAuth();
    const { currentOrg, organizations, setCurrentOrg } = useOrganization();
    const router = useRouter();
    const [tools, setTools] = useState<ToolSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [isGlobalView, setIsGlobalView] = useState(false);

    useEffect(() => {
        if (user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        fetchTools();
    }, [user, currentOrg, isGlobalView]);

    const fetchTools = async () => {
        setLoading(true);
        try {
            const tenantId = isGlobalView ? 'GLOBAL' : (currentOrg?.tenant_id || 'GLOBAL');
            const res = await fetch(`http://localhost:3000/admin/config/tools?tenantId=${tenantId === 'GLOBAL' ? '' : tenantId}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            setTools(data.tools || []);
        } catch (err) {
            console.error('Failed to fetch tool settings', err);
        } finally {
            setLoading(false);
        }
    };

    const updateTool = async (tool: ToolSetting) => {
        setSaving(tool.tool_name);
        try {
            const payload = {
                ...tool,
                tenant_id: isGlobalView ? null : (currentOrg?.tenant_id || null)
            };

            await fetch('http://localhost:3000/admin/config/tools', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(payload)
            });
            await fetchTools();
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setSaving(null);
        }
    };

    if (loading && tools.length === 0) {
        return (
            <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const isGlobalAdmin = user?.userId === 'admin'; // For the demo, 'admin' is the global superuser

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter border border-blue-500/30">System Config</span>
                        <Link href="/dashboard" className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase font-bold tracking-widest">
                            ← Volver al Dashboard
                        </Link>
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                        AI GOVERNANCE<span className="text-blue-500">ENGINE</span>
                    </h1>
                </div>

                {isGlobalAdmin && (
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setIsGlobalView(false)}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${!isGlobalView ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Org Config
                        </button>
                        <button
                            onClick={() => setIsGlobalView(true)}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${isGlobalView ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Global Defaults
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-8">
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-blue-500/40 decoration-4 underline-offset-8">
                                {isGlobalView ? 'Configuración Global' : `Configuración: ${currentOrg?.name || 'Cargando...'}`}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-4">
                                {isGlobalView ? 'Valores por defecto para todo el sistema' : `Sobrescribe los valores globales para ${currentOrg?.name}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 font-mono">TENANT_ID: {isGlobalView ? 'NULL (DEFAULT)' : currentOrg?.tenant_id}</p>
                            <button onClick={fetchTools} className="text-blue-500 text-[10px] font-bold uppercase hover:text-white transition-colors">Refrescar</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {tools.length === 0 && !loading && (
                            <div className="glass p-12 text-center rounded-3xl border border-dashed border-white/10">
                                <p className="text-gray-500 font-bold uppercase tracking-widest">No hay configuraciones específicas para este nivel.</p>
                                {!isGlobalView && (
                                    <button
                                        onClick={() => updateTool({
                                            tool_name: '*',
                                            provider: 'internal',
                                            model: '*',
                                            tier: 'standard',
                                            estimated_tokens_out: 500,
                                            is_active: 1,
                                            tenant_id: currentOrg?.tenant_id || null
                                        })}
                                        className="mt-4 bg-blue-600/20 text-blue-400 px-6 py-2 rounded-xl text-[10px] font-bold uppercase border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                                    >
                                        Crear Override General (*)
                                    </button>
                                )}
                            </div>
                        )}
                        {tools.map((tool) => (
                            <div key={tool.tool_name} className="glass p-8 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-8 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-6 w-full lg:w-1/4">
                                    <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-2xl border border-blue-500/20">🛠️</div>
                                    <div>
                                        <p className="text-white font-black italic uppercase tracking-tight text-xl">{tool.tool_name === '*' ? 'Global Fallback (*)' : tool.tool_name}</p>
                                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Tool Identifier</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full lg:w-1/2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Provider</label>
                                        <select
                                            value={tool.provider}
                                            onChange={(e) => updateTool({ ...tool, provider: e.target.value })}
                                            className="input-premium bg-[#0f111a]"
                                        >
                                            <option value="openai">OpenAI</option>
                                            <option value="anthropic">Anthropic</option>
                                            <option value="google">Google</option>
                                            <option value="internal">Internal Engine</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Model ID</label>
                                        <input
                                            type="text"
                                            value={tool.model}
                                            onChange={(e) => setTools(tools.map(t => t.tool_name === tool.tool_name ? { ...t, model: e.target.value } : t))}
                                            onBlur={() => updateTool(tool)}
                                            className="input-premium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tokens Out (Est)</label>
                                        <input
                                            type="number"
                                            value={tool.estimated_tokens_out}
                                            onChange={(e) => setTools(tools.map(t => t.tool_name === tool.tool_name ? { ...t, estimated_tokens_out: parseInt(e.target.value) } : t))}
                                            onBlur={() => updateTool(tool)}
                                            className="input-premium font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full lg:w-auto">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado</p>
                                        <p className={tool.is_active ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                            {tool.is_active ? 'ENABLED' : 'DISABLED'}
                                        </p>
                                    </div>
                                    {saving === tool.tool_name ? (
                                        <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                    ) : (
                                        <button
                                            onClick={() => updateTool({ ...tool, is_active: tool.is_active ? 0 : 1 })}
                                            className={`p-3 rounded-xl border transition-all ${tool.is_active ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}
                                        >
                                            {tool.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
