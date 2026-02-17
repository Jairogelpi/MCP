'use client';

import React, { useState, useEffect } from 'react';
import { GATEWAY_URL } from '../lib/config';

interface AgentPolicyConfig {
    agent_id: string;
    mode: 'open' | 'budget' | 'strict' | 'high_security';
    allowed_upstreams?: string[];
    allowed_actions?: string[];
    allowed_models?: string[];
    daily_budget?: number;
    monthly_budget?: number;
    hard_cap?: boolean;
    require_approval_actions?: boolean;
    approval_threshold?: number;
    require_approval_prod?: boolean;
    requests_per_minute?: number;
    tokens_per_request?: number;
}

interface Props {
    agentId: string;
    agentName: string;
    token: string;
    onClose: () => void;
}

export function AgentControls({ agentId, agentName, token, onClose }: Props) {
    const [config, setConfig] = useState<AgentPolicyConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'access' | 'budget' | 'approval' | 'usage'>('access');

    useEffect(() => {
        fetchConfig();
    }, [agentId]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${GATEWAY_URL}/admin/agents/${agentId}/governance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setConfig(data);
        } catch (err) {
            console.error('Failed to fetch agent config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await fetch(`${GATEWAY_URL}/admin/agents/${agentId}/governance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });
            alert('Governance updated successfully.');
            onClose();
        } catch (err) {
            alert('Failed to save governance.');
        } finally {
            setSaving(false);
        }
    };

    const applyPreset = (mode: AgentPolicyConfig['mode']) => {
        if (!config) return;
        let newConfig = { ...config, mode };

        if (mode === 'open') {
            newConfig.hard_cap = false;
            newConfig.require_approval_actions = false;
            newConfig.require_approval_prod = false;
        } else if (mode === 'budget') {
            newConfig.daily_budget = 50;
            newConfig.hard_cap = true;
            newConfig.require_approval_actions = false;
        } else if (mode === 'strict') {
            newConfig.require_approval_actions = true;
            newConfig.require_approval_prod = true;
            newConfig.hard_cap = true;
            newConfig.daily_budget = 100;
        } else if (mode === 'high_security') {
            newConfig.require_approval_actions = true;
            newConfig.require_approval_prod = true;
            newConfig.approval_threshold = 0;
            newConfig.requests_per_minute = 10;
        }

        setConfig(newConfig);
    };

    if (loading) return <div className="p-12 text-center text-gray-500 font-mono animate-pulse uppercase tracking-widest text-xs">Sincronizando Core...</div>;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex justify-end animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-[#0a0c10] border-l border-white/5 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-500">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                            Agent <span className="text-blue-500">Controls</span>
                        </h2>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Configuring: {agentName}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-xs font-bold uppercase tracking-widest text-gray-400">
                        Close
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Security Presets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(['open', 'budget', 'strict', 'high_security'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => applyPreset(m)}
                                className={`p-4 rounded-2xl border text-center transition-all ${config?.mode === m
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10'
                                    : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'
                                    }`}
                            >
                                <p className="text-[10px] font-black uppercase tracking-tighter">{m.replace('_', ' ')}</p>
                            </button>
                        ))}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                        {(['access', 'budget', 'approval', 'usage'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="glass p-8 rounded-3xl border border-white/5">
                        {activeTab === 'access' && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Allowed Models</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'deepseek-v3'].map(model => (
                                            <label key={model} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={config?.allowed_models?.includes(model)}
                                                    onChange={e => {
                                                        const current = config?.allowed_models || [];
                                                        setConfig({
                                                            ...config!,
                                                            allowed_models: e.target.checked
                                                                ? [...current, model]
                                                                : current.filter(m => m !== model)
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500/20"
                                                />
                                                <span className="text-[10px] font-mono text-gray-300">{model}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'budget' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Daily Limit ($)</label>
                                        <input
                                            type="number"
                                            className="input-premium"
                                            value={config?.daily_budget || ''}
                                            onChange={e => setConfig({ ...config!, daily_budget: Number(e.target.value) })}
                                            placeholder="No limit"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 p-4 bg-red-500/5 rounded-2xl border border-red-500/10 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config?.hard_cap}
                                            onChange={e => setConfig({ ...config!, hard_cap: e.target.checked })}
                                            className="w-4 h-4 rounded border-red-900/40 bg-gray-800 text-red-600"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-red-400 uppercase tracking-tighter">Hard Cap</p>
                                            <p className="text-[9px] text-red-400/50 uppercase">Bloquear peticiones si superan el presupuesto</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'approval' && (
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config?.require_approval_actions}
                                        onChange={e => setConfig({ ...config!, require_approval_actions: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-tighter">HITL for High Risk</p>
                                        <p className="text-[9px] text-gray-500 uppercase">Requiere aprobación para herramientas críticas</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config?.require_approval_prod}
                                        onChange={e => setConfig({ ...config!, require_approval_prod: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-tighter">Verify in Production</p>
                                        <p className="text-[9px] text-gray-500 uppercase">Toda petición a PROD debe ser validada</p>
                                    </div>
                                </label>
                            </div>
                        )}

                        {activeTab === 'usage' && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Requests per Minute (RPM)</label>
                                    <input
                                        type="number"
                                        className="input-premium"
                                        value={config?.requests_per_minute || ''}
                                        onChange={e => setConfig({ ...config!, requests_per_minute: Number(e.target.value) })}
                                        placeholder="No limit"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-3xl flex gap-6 items-center">
                        <span className="text-2xl">⚡</span>
                        <p className="text-[10px] text-blue-300 italic font-medium leading-relaxed">
                            Cambios aplicados instantáneamente al motor de políticas ABAC v2. Se generarán múltiples reglas internas de forma transparente.
                        </p>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-white/[0.01] flex gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl uppercase italic tracking-tighter transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                    >
                        {saving ? 'Synchronizing Policies...' : 'Deploy Governance Core'}
                    </button>
                </div>
            </div>
        </div>
    );
}
