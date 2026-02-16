'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { ActivityTable } from '../../../components/ActivityTable';
import Link from 'next/link';

export default function ActivityPage() {
    const { user } = useAuth();
    const { currentOrg } = useOrganization();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchActivity = async () => {
        if (!user || !currentOrg) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/admin/ledger/${currentOrg.tenant_id}/recent`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            setActivities(data.receipts || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 5000); // Auto-refresh for "Live" feel
        return () => clearInterval(interval);
    }, [user, currentOrg]);

    if (!currentOrg) {
        return (
            <div className="p-12 text-center">
                <p className="text-gray-500">Please select an organization first.</p>
                <Link href="/dashboard" className="text-blue-400 hover:text-white mt-4 inline-block">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors">← Back</Link>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Live <span className="text-emerald-500">Activity</span> Log
                </h1>
                {loading && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
            </div>

            <div className="space-y-2">
                <p className="text-sm text-gray-400 max-w-2xl">
                    Real-time inspection of <strong>Core Contract</strong> events for <strong>{currentOrg.name}</strong>.
                    Every interaction is cryptographically signed and recorded.
                </p>
            </div>

            <ActivityTable activities={activities} />
        </div>
    );
}
