'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LiveLedger } from '../components/LiveLedger';

interface SystemStatus {
    status: string;
    ledger: {
        total_receipts: number;
        active_reservations: number;
    };
    chain: {
        configured_scopes: number;
        integrity: string;
    };
    adapters: {
        database: string;
        banking: string;
        identity: string;
    };
}

interface Tenant {
    id: string;
    name: string;
    status: string;
    budget: number;
    spent: number;
    currency: string;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { currentOrg, organizations, setCurrentOrg, createOrganization } = useOrganization();
    const router = useRouter();
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, currentOrg]);

    const fetchDashboardData = async () => {
        if (!user) return;
        try {
            const [statusRes, tenantsRes] = await Promise.all([
                fetch('http://localhost:3000/admin/system/status', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch('http://localhost:3000/admin/tenants', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
            ]);
            const statusData = await statusRes.json();
            const tenantsData = await tenantsRes.json();

            if (statusData && statusData.ledger) {
                setStatus(statusData);
            }

            // Filter tenants to only show the CURRENT organization/tenant in this view
            // In a better API, /admin/tenants would take a tenantId filter
            const allTenants: Tenant[] = tenantsData.tenants || [];
            if (currentOrg) {
                setTenants(allTenants.filter(t => t.id === currentOrg.tenant_id));
            } else {
                setTenants(allTenants);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    const updateBudget = async (id: string, newLimit: number) => {
        setUpdatingId(id);
        try {
            await fetch(`http://localhost:3000/admin/tenants/${id}/budget`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ limit: newLimit })
            });
            await fetchDashboardData();
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        await createOrganization(newOrgName, 100);
        setShowCreateOrg(false);
        setNewOrgName('');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
            {/* Header with Org Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter border border-blue-500/30">Organization Node</span>
                        <div className="relative group">
                            <select
                                value={currentOrg?.tenant_id || ''}
                                onChange={(e) => {
                                    const org = organizations.find(o => o.tenant_id === e.target.value);
                                    if (org) setCurrentOrg(org);
                                }}
                                className="bg-[#0f111a] text-gray-400 text-[10px] font-bold px-4 py-1 rounded border border-white/10 outline-none focus:border-blue-500/50 appearance-none cursor-pointer pr-8 uppercase"
                            >
                                {organizations.map(org => (
                                    <option key={org.tenant_id} value={org.tenant_id}>{org.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-gray-500">▼</div>
                        </div>
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setShowCreateOrg(true)}
                                className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-lg uppercase border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10"
                            >
                                + Nueva Organización
                            </button>
                        )}
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                        AGENT<span className="text-blue-500">PAY</span> <span className="text-gray-600">Command</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {user?.role === 'admin' && (
                        <>
                            <Link href="/dashboard/approvals" className="text-xs font-bold text-yellow-500 hover:text-white transition-colors uppercase tracking-widest bg-yellow-500/10 px-6 py-3 rounded-xl border border-yellow-500/20">
                                Pendientes
                            </Link>
                            <Link href="/dashboard/settings" className="text-xs font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-widest bg-indigo-500/10 px-6 py-3 rounded-xl border border-indigo-500/20">
                                Gobernanza de IA
                            </Link>
                            <Link href="/dashboard/organization" className="text-xs font-bold text-gray-100 hover:text-white transition-colors uppercase tracking-widest bg-blue-600/20 px-6 py-3 rounded-xl border border-blue-500/30">
                                Control de Acceso e IAM
                            </Link>
                        </>
                    )}
                    <Link href="/" className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5">
                        Salir
                    </Link>
                </div>
            </div>

            {/* Create Org Modal */}
            {showCreateOrg && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass p-8 rounded-3xl w-full max-w-md space-y-6">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Fundar Nueva Organización</h3>
                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre de la Entidad</label>
                                <input
                                    type="text"
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    placeholder="Ex: CyberDyne Systems"
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl uppercase italic tracking-tighter transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                    Desplegar
                                </button>
                                <button type="button" onClick={() => setShowCreateOrg(false)} className="px-6 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ... Rest of components ... */}

            {/* Grid 1: System Health (Phase 0) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-8 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">🛡️</div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">SECURED</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Integridad del Ledger</h3>
                        <p className="text-2xl font-black text-white italic uppercase tracking-tight">
                            {status?.chain?.integrity ? `Hash Chain ${status.chain.integrity}` : 'Validating...'}
                        </p>
                    </div>
                    <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-gray-600 uppercase font-bold">Recibos Totales</p>
                            <p className="text-xl font-mono text-blue-400">{status?.ledger?.total_receipts ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-600 uppercase font-bold">Reservas Activas</p>
                            <p className="text-xl font-mono text-indigo-400">{status?.ledger?.active_reservations ?? 0}</p>
                        </div>
                    </div>
                </div>

                <div className="glass p-8 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-blue-500/10 rounded-2xl">🌉</div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded">ACTIVE</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Configuración Scopes</h3>
                        <p className="text-2xl font-black text-white italic uppercase tracking-tight">{status?.chain?.configured_scopes ?? 0} Domains Connected</p>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[10px] text-gray-600 uppercase font-bold">Consenso Determinista</p>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse text-[0px]">.</div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100 text-[0px]">.</div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200 text-[0px]">.</div>
                        </div>
                    </div>
                </div>

                <div className="glass p-8 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">🔌</div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Adapters Stack</h3>
                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-500">DB:</span>
                                <span className="text-white">{status?.adapters?.database || 'Connecting...'}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-500">BANK:</span>
                                <span className="text-emerald-400">{status?.adapters?.banking || 'Ready'}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-500">ID:</span>
                                <span className="text-indigo-400">{status?.adapters?.identity || 'IAM-Secure'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Ledger Component (Phase 0 Visibility) */}
            {currentOrg && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-emerald-500/40 decoration-4 underline-offset-8">Core Contract Activity</h2>
                    <LiveLedger tenantId={currentOrg.tenant_id} />
                </div>
            )}

            {/* Grid 2: Tenant & Financial Control (Phase 1) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-blue-500/40 decoration-4 underline-offset-8">Gobernanza de Inquilinos</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {tenants.length === 0 && (
                        <div className="glass p-12 text-center rounded-3xl border border-dashed border-white/10 space-y-4">
                            <p className="text-gray-500 font-bold uppercase tracking-widest">No se encontraron organizaciones activas para este usuario.</p>
                            <button
                                onClick={() => setShowCreateOrg(true)}
                                className="bg-blue-600/20 text-blue-400 px-8 py-3 rounded-2xl text-xs font-bold uppercase border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-blue-500/10"
                            >
                                Fundar Mi Primera Organización
                            </button>
                        </div>
                    )}
                    {tenants.map((tenant) => (
                        <div key={tenant.id} className="glass p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-6 w-full md:w-1/3">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-black rounded-xl border border-white/10 flex items-center justify-center text-xl shadow-lg">
                                    🏢
                                </div>
                                <div>
                                    <p className="text-white font-bold tracking-tight">{tenant.name}</p>
                                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{tenant.id}</p>
                                </div>
                            </div>

                            <div className="w-full md:w-1/3 space-y-2">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                                    <span className="text-gray-500">Consumo de Presupuesto</span>
                                    <span className={tenant.spent >= tenant.budget ? 'text-red-500' : 'text-blue-400'}>
                                        {Math.round((tenant.spent / tenant.budget) * 100)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (tenant.spent / tenant.budget) * 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-gray-600">
                                    <span>{tenant.spent} {tenant.currency} Gastado</span>
                                    <span>Límite: {tenant.budget} {tenant.currency}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => updateBudget(tenant.id, tenant.budget + 50)}
                                        disabled={updatingId === tenant.id}
                                        className="flex-1 md:flex-none glass-light px-6 py-3 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all transform active:scale-95 disabled:opacity-50"
                                    >
                                        {updatingId === tenant.id ? 'Sincronizando...' : '+ 50 Presupuesto'}
                                    </button>
                                )}
                                <Link
                                    href="/dashboard/organization"
                                    onClick={() => setCurrentOrg(tenant as any)}
                                    className="p-3 bg-black/40 rounded-xl border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-colors shadow-lg"
                                    title="Control de Acceso y API Keys"
                                >
                                    🔑
                                </Link>
                                <Link
                                    href="/dashboard/settings"
                                    onClick={() => setCurrentOrg(tenant as any)}
                                    className="p-3 bg-black/40 rounded-xl border border-white/5 cursor-pointer hover:border-blue-500/30 transition-colors shadow-lg"
                                    title="Configuración de IA"
                                >
                                    ⚙️
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid 3: DevOps Console (Phase 2.6) */}
            <div className="space-y-6">
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-purple-500/40 decoration-4 underline-offset-8">DevOps Console</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href="/dashboard/api-keys" className="glass p-8 rounded-3xl hover:bg-white/5 transition-all group border border-white/5 hover:border-blue-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-4 bg-blue-600/20 rounded-2xl text-2xl group-hover:scale-110 transition-transform">🔑</div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-400">Access Control</span>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight mb-2">API Keys & Credentials</h3>
                        <p className="text-xs text-gray-500 font-mono">Manage programmatic access for your applications. Rotate secrets and revoke compromised keys.</p>
                    </Link>

                    <Link href="/dashboard/upstreams" className="glass p-8 rounded-3xl hover:bg-white/5 transition-all group border border-white/5 hover:border-purple-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-4 bg-purple-600/20 rounded-2xl text-2xl group-hover:scale-110 transition-transform">📡</div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-purple-400">Connectivity</span>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight mb-2">Upstream Gateways</h3>
                        <p className="text-xs text-gray-500 font-mono">Configure routing to external MCP Servers and APIs. Manage authentication and base URLs.</p>
                    </Link>
                    <Link href="/dashboard/activity" className="glass p-8 rounded-3xl hover:bg-white/5 transition-all group border border-white/5 hover:border-emerald-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-4 bg-emerald-600/20 rounded-2xl text-2xl group-hover:scale-110 transition-transform">📊</div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-emerald-400">Observability</span>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight mb-2">Live Activity Log</h3>
                        <p className="text-xs text-gray-500 font-mono">Real-time inspection of Core Contract interactions. View latencies, receipts, and policy decisions.</p>
                    </Link>

                    <Link href="/dashboard/playground" className="glass p-8 rounded-3xl hover:bg-white/5 transition-all group border border-white/5 hover:border-pink-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-4 bg-pink-600/20 rounded-2xl text-2xl group-hover:scale-110 transition-transform">🎮</div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-pink-400">Test Lab</span>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight mb-2">Contract Playground</h3>
                        <p className="text-xs text-gray-500 font-mono">Interactive JSON-RPC builder with AJV schema validation and SSE response visualization.</p>
                    </Link>

                    <Link href="/dashboard/agents" className="glass p-8 rounded-3xl hover:bg-white/5 transition-all group border border-white/5 hover:border-emerald-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-4 bg-emerald-600/20 rounded-2xl text-2xl group-hover:scale-110 transition-transform">🤖</div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-emerald-400">Autonomous IAM</span>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight mb-2">Agents & Entities</h3>
                        <p className="text-xs text-gray-500 font-mono">Define non-human identities, assign roles, and manage autonomous programmatic access.</p>
                    </Link>

                    <Link href="/dashboard/policies" className="glass p-8 rounded-3xl hover:bg-white/5 transition-all group border border-white/5 hover:border-blue-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-4 bg-blue-600/20 rounded-2xl text-2xl group-hover:scale-110 transition-transform">⚖️</div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-400">Policy Engine</span>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight mb-2">Governance Architect</h3>
                        <p className="text-xs text-gray-500 font-mono">Design multi-dimensional policies with deterministic evaluation and real-time simulation.</p>
                    </Link>
                </div>
            </div>

            {/* Matrix Footer */}
            <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-gray-700 font-mono uppercase tracking-[0.3em]">
                <div className="flex gap-4">
                    <span className="text-blue-900 font-black tracking-tighter">PHASE 0:</span> REAL-TIME IMMUTABILITY [ACTIVE]
                </div>
                <div className="flex gap-4">
                    <span className="text-indigo-900 font-black tracking-tighter">PHASE 1:</span> SOVEREIGN CONNECTIVITY [ONLINE]
                </div>
                <div className="text-gray-800">
                    AgentShield Kernel v2.4.0-Stable // Ledger: Closed-Fail Mode
                </div>
            </div>
        </div>
    );
}
