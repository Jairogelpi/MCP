'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { PolicyBuilder } from '../../../components/PolicyBuilder';
import Link from 'next/link';

export default function PoliciesPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2 text-blue-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                        <span>Governance Control Plane</span>
                        <span className="text-gray-700">/</span>
                        <span>Multi-Layer Policies</span>
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                        AI <span className="text-blue-500">Governance</span> Logic
                    </h1>
                </div>
                <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5">
                    Regresar
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-blue-500/40 decoration-4 underline-offset-8 mb-8">
                            Policy Blueprint
                        </h2>
                        <PolicyBuilder tenantId={currentOrg?.tenant_id || ''} token={user?.token || ''} />
                    </section>
                </div>

                <div className="space-y-8">
                    <div className="glass p-8 rounded-3xl space-y-6 border border-emerald-500/10">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit">⚖️</div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Active Layers</h3>
                        <p className="text-gray-500 text-xs leading-relaxed italic">
                            AgentShield utiliza un motor determinista. Las políticas se evalúan en cascada: Org → Agent → Upstream.
                        </p>
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <span>Default: Baseline Org Security</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-emerald-400 font-bold">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span>Enforced: {currentOrg?.name || 'Global'} Standard</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-8 rounded-3xl space-y-6 opacity-50 border border-white/5">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit">📈</div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Risk Analytics</h3>
                        <p className="text-gray-500 text-xs">
                            Estadísticas avanzadas sobre políticas denegadas y aprobaciones en cola. Estará disponible en la siguiente actualización.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
