'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { GATEWAY_URL } from '../../lib/config';

interface User {
    userId: string;
    tenantId: string;
    email: string;
    token: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('mcp_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(`${GATEWAY_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (data.success) {
                const newUser: User = {
                    userId: data.userId,
                    tenantId: data.tenantId || '',
                    email,
                    token: data.token || '',
                    role: data.role || 'viewer'
                };
                setUser(newUser);
                localStorage.setItem('mcp_user', JSON.stringify(newUser));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'SERVER_ERROR' };
        }
    };

    const register = async (email: string, name: string, password: string) => {
        try {
            const res = await fetch(`${GATEWAY_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password }),
            });
            const data = await res.json();

            if (data.success) {
                const newUser: User = {
                    userId: data.userId,
                    tenantId: data.tenantId || '',
                    email,
                    token: data.token || '',
                    role: data.role || 'admin'
                };
                setUser(newUser);
                localStorage.setItem('mcp_user', JSON.stringify(newUser));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'SERVER_ERROR' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('mcp_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
