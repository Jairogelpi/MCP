'use client';

import React, { useState } from 'react';
import { GATEWAY_URL } from '../lib/config';

interface PolicyPreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    effect: 'deny' | 'require_approval' | 'transform' | 'allow';
    conditions: any;
}

const PRESETS: PolicyPreset[] = [
    {
        id: 'read_only',
        name: 'Safe-View Mode',
        description: 'Deny all tool executions. Read-only node access.',
        icon: '🛡️',
        effect: 'deny',
        conditions: { scope_type: 'tenant' }
    },
    {
        id: 'approval_required',
        name: 'HITL Protocol',
        description: 'Require manual approval for all high-risk tool calls.',
        icon: '⚖️',
        effect: 'require_approval',
        conditions: { min_risk: 'high' }
    },
    {
        id: 'budget_strict',
        name: 'Fiscal Guard',
        description: 'Auto-block if budget utilization exceeds 90%.',
        icon: '💰',
        effect: 'deny',
        conditions: { over_budget: true }
    },
    {
        id: 'temporal_gating',
        name: 'Temporal Lock',
        description: 'Restrict access to standard business hours (09:00-18:00).',
        icon: '🕒',
        effect: 'deny',
        conditions: { time_window: '09:00-18:00', inverse: true }
    },
];

export function PolicyBuilder({ tenantId, token }: { tenantId: string, token: string }) {
    const [activePresets, setActivePresets] = useState<string[]>([]);
    const [simulating, setSimulating] = useState(false);
    const [simResult, setSimResult] = useState<any>(null);
    const [deploying, setDeploying] = useState(false);

    const togglePreset = (id: string) => {
        setActivePresets(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleApply = async () => {
        setDeploying(true);
        try {
            // Translate presets to policies
            const policiesToDeploy = PRESETS.filter(p => activePresets.includes(p.id)).map(p => ({
                id: `pol_${p.id}_${tenantId.slice(-4)}`,
                tenant_id: tenantId,
                scope_type: 'tenant',
                scope_id: tenantId,
                priority: 100,
                mode: 'enforce',
                effect: p.effect,
                conditions: p.conditions,
                version: '2.0.0'
            }));

            // Deploy sequentially for simplicity in this demo
            for (const pol of policiesToDeploy) {
                await fetch(`${GATEWAY_URL}/admin/policies`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(pol)
                });
            }

            alert(`Successfully deployed ${policiesToDeploy.length} governance layers.`);
        } catch (err) {
            console.error('Deployment failed', err);
            alert('Governance deployment failed. Check connectivity.');
        } finally {
            setDeploying(false);
        }
    };

    const runSimulation = () => {
        setSimulating(true);
        setTimeout(() => {
            const hasDeny = activePresets.some(id => PRESETS.find(p => p.id === id)?.effect === 'deny');
            const hasApproval = activePresets.some(id => PRESETS.find(p => p.id === id)?.effect === 'require_approval');

            setSimResult({
                decision: hasDeny ? 'DENY' : (hasApproval ? 'REQUIRE_APPROVAL' : 'ALLOW'),
                triggered_by: activePresets[0] || 'baseline',
                risk_score: 0.85,
                receipt_preview: 'rec_sim_0123'
            });
            setSimulating(false);
        }, 1500);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PRESETS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => togglePreset(preset.id)}
                        className={`p-6 rounded-3xl text-left transition-all border-2 ${activePresets.includes(preset.id)
                            ? 'bg-blue-600/10 border-blue-500 shadow-xl shadow-blue-500/10'
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                            }`}
                    >
                        <div className="text-3xl mb-4">{preset.icon}</div>
                        <h4 className="text-white font-black uppercase tracking-tighter italic mb-2">{preset.name}</h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{preset.description}</p>
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                <div className="flex gap-2">
                    {activePresets.length === 0 ? (
                        <span className="text-xs font-bold text-gray-600 uppercase italic">No se han seleccionado capas de seguridad</span>
                    ) : (
                        activePresets.map(p => (
                            <span key={p} className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/30 uppercase tracking-tighter">
                                {p.replace('_', ' ')}
                            </span>
                        ))
                    )}
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={runSimulation}
                        className="px-8 py-3 rounded-2xl text-xs font-black text-white hover:bg-white/5 transition-all uppercase italic border border-white/10"
                    >
                        {simulating ? 'Simulating...' : 'Simulate Matrix'}
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={activePresets.length === 0 || deploying}
                        className="px-10 py-3 rounded-2xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 transition-all uppercase italic shadow-lg shadow-blue-500/20 disabled:opacity-30"
                    >
                        {deploying ? 'Deploying...' : 'Deploy Policies'}
                    </button>
                </div>
            </div>

            {simResult && (
                <div className="glass p-8 rounded-3xl border-l-4 border-l-emerald-500 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start">
                        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Simulation Result</h3>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${simResult.decision === 'ALLOW' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            Result: {simResult.decision}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-2">Triggered Policy</p>
                            <p className="text-white font-mono text-sm">{simResult.triggered_by}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-2">Conflict Affinity</p>
                            <p className="text-white font-mono text-sm">Deterministic Order</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-2">Simulated Receipt</p>
                            <p className="text-blue-400 font-mono text-sm underline cursor-pointer">{simResult.receipt_preview}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
