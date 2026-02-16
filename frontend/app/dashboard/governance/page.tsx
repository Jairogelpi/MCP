'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BudgetedItem {
    id: string;
    name: string;
    budget: number;
    spent: number;
    currency: string;
    type: 'tenant' | 'department' | 'user' | 'tool';
}

interface Department extends BudgetedItem {
    dept_id: string;
    description: string;
}

interface Member {
    user_id: string;
    name: string;
    email: string;
    role_id: string;
    status: string;
    budget?: number;
    spent?: number;
}

interface FunctionalScope extends BudgetedItem {
    scope_id: string;
    description: string;
}

export default function GovernancePage() {
    const { user, loading: authLoading } = useAuth();
    const { currentOrg, loading: orgLoading } = useOrganization();
    const router = useRouter();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [scopes, setScopes] = useState<FunctionalScope[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
        } else if (currentOrg) {
            fetchGovernanceData();
        }
    }, [user, currentOrg]);

    const fetchGovernanceData = async () => {
        if (!currentOrg) return;
        setLoading(true);
        try {
            const [deptsRes, membersRes, scopesRes] = await Promise.all([
                fetch(`http://localhost:3000/admin/org/${currentOrg.tenant_id}/departments`),
                fetch(`http://localhost:3000/admin/org/members/${currentOrg.tenant_id}`),
                fetch(`http://localhost:3000/admin/functional-scopes`)
            ]);

            const deptsData = await deptsRes.json();
            const membersData = await membersRes.json();
            const scopesData = await scopesRes.json();

            setDepartments(deptsData.departments || []);
            setMembers(membersData.members || []);
            setScopes(scopesData.scopes || []);
        } catch (err) {
            console.error('Failed to fetch governance data', err);
        } finally {
            setLoading(false);
        }
    };

    const updateLimit = async (type: string, id: string, limit: number) => {
        setUpdatingId(`${type}:${id}`);
        try {
            const res = await fetch(`http://localhost:3000/admin/budgets/${type}/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit })
            });
            if (res.status === 403) {
                alert('No tienes permisos para modificar este presupuesto.');
                return;
            }
            await fetchGovernanceData();
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setUpdatingId(null);
        }
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-indigo-600/20 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter border border-indigo-500/30">Governance Engine</span>
                        <Link href="/dashboard" className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase font-bold tracking-widest">
                            ← Volver al Dashboard
                        </Link>
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                        HIERARCHY<span className="text-indigo-500">EXPLORER</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Organización Activa</p>
                        <p className="text-white font-black italic uppercase tracking-tight">{currentOrg?.name}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-xl">
                        🏛️
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Departments */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Departamentos</h2>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded uppercase">{departments.length}</span>
                    </div>
                    <div className="space-y-4">
                        {departments.map((dept) => (
                            <BudgetCard
                                key={dept.dept_id}
                                item={dept}
                                type="department"
                                onUpdate={updateLimit}
                                loadingId={updatingId}
                            />
                        ))}
                        <button className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:border-indigo-500/20 hover:text-gray-400 transition-all">
                            + Crear Departamento
                        </button>
                    </div>
                </div>

                {/* Column 2: Specific Members */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Miembros / Agents</h2>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded uppercase">{members.length}</span>
                    </div>
                    <div className="space-y-4">
                        {members.map((member) => (
                            <BudgetCard
                                key={member.user_id}
                                item={{
                                    id: member.user_id,
                                    name: member.name,
                                    budget: member.budget || 0,
                                    spent: member.spent || 0,
                                    currency: 'EUR'
                                } as any}
                                type="user"
                                onUpdate={updateLimit}
                                loadingId={updatingId}
                            />
                        ))}
                    </div>
                </div>

                {/* Column 3: Tools & Scopes */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Acciones / Herramientas</h2>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded uppercase">{scopes.length}</span>
                    </div>
                    <div className="space-y-4">
                        {scopes.map((scope) => (
                            <BudgetCard
                                key={scope.scope_id}
                                item={scope}
                                type="tool"
                                onUpdate={updateLimit}
                                loadingId={updatingId}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Sovereign Legend */}
            <div className="glass p-8 rounded-3xl border-indigo-500/10">
                <div className="flex items-center gap-4 mb-6 text-indigo-400 font-black italic uppercase tracking-tighter italic">
                    <span className="text-2xl">⚠️</span> ATENCIÓN: SOBERANÍA DETERMINISTA
                </div>
                <p className="text-gray-500 text-xs leading-relaxed max-w-3xl">
                    Cualquier cambio en los límites jerárquicos se aplica de forma instantánea a nivel de <span className="text-white">Kernel Ledger</span>.
                    El sistema denegará cualquier transacción que supere el límite más restrictivo de la cadena de mando.
                    No se permiten sobregiros sin aprobación explícita de la raíz (Organization Admin).
                </p>
            </div>
        </div>
    );
}

function BudgetCard({ item, type, onUpdate, loadingId }: { item: BudgetedItem, type: string, onUpdate: (type: string, id: string, limit: number) => void, loadingId: string | null }) {
    const { user } = useAuth();
    const isUpdating = loadingId === `${type}:${item.id}`;

    return (
        <div className="glass-light p-6 rounded-2xl space-y-4 border border-white/5 hover:border-white/10 transition-colors group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-white font-bold tracking-tight">{item.name}</p>
                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{type}: {item.id}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-white italic">{item.budget} <span className="text-[10px] text-gray-500 uppercase not-italic">{item.currency}</span></p>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{item.spent} gastado</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-gray-500">Capacidad de Gasto</span>
                    <span className={item.spent >= item.budget ? 'text-red-500' : 'text-indigo-400'}>
                        {item.budget > 0 ? Math.round((item.spent / item.budget) * 100) : 0}%
                    </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                        className={`h-full bg-gradient-to-r transition-all duration-1000 ${type === 'department' ? 'from-indigo-600 to-purple-600' :
                            type === 'user' ? 'from-blue-600 to-indigo-600' :
                                'from-emerald-600 to-teal-600'
                            }`}
                        style={{ width: `${Math.min(100, item.budget > 0 ? (item.spent / item.budget) * 100 : 0)}%` }}
                    ></div>
                </div>
            </div>

            <div className={`flex gap-2 pt-2 transition-opacity ${type === 'tool' && user?.tenantId !== 'acme' ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                    onClick={() => onUpdate(type, item.id, item.budget + 10)}
                    disabled={isUpdating}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 py-2 rounded-lg uppercase tracking-widest border border-white/5 disabled:opacity-50"
                >
                    {isUpdating ? '...' : '+10 Limit'}
                </button>
                <button
                    onClick={() => onUpdate(type, item.id, Math.max(0, item.budget - 10))}
                    disabled={isUpdating}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 py-2 rounded-lg uppercase tracking-widest border border-white/5 disabled:opacity-50"
                >
                    {isUpdating ? '...' : '-10 Limit'}
                </button>
            </div>
        </div>
    );
}
