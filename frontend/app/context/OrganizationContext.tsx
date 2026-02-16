'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Organization {
    tenant_id: string;
    name: string;
    owner_id: string;
    status: string;
}

interface OrganizationContextType {
    currentOrg: Organization | null;
    organizations: Organization[];
    setCurrentOrg: (org: Organization) => void;
    fetchOrganizations: () => Promise<void>;
    createOrganization: (name: string, initialBudget: number) => Promise<void>;
    loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOrganizations = async () => {
        if (!user) return;
        try {
            const res = await fetch('http://localhost:3000/admin/tenants', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            setOrganizations(data.tenants || []);

            if (!currentOrg && data.tenants && data.tenants.length > 0) {
                setCurrentOrg(data.tenants[0]);
            }
        } catch (err) {
            console.error('Failed to fetch organizations', err);
        } finally {
            setLoading(false);
        }
    };

    const createOrganization = async (name: string, initialBudget: number) => {
        if (!user) return;
        try {
            const res = await fetch('http://localhost:3000/admin/org/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ name, ownerId: user.userId, initialBudget })
            });
            if (res.ok) {
                await fetchOrganizations();
            }
        } catch (err) {
            console.error('Failed to create organization', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchOrganizations();
        }
    }, [user]);

    return (
        <OrganizationContext.Provider value={{
            currentOrg,
            organizations,
            setCurrentOrg,
            fetchOrganizations,
            createOrganization,
            loading
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
