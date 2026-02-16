'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const res = await login(email, password);
        if (res.success) {
            router.push('/');
        } else {
            setError(res.error || 'Credenciales inválidas');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-md glass rounded-3xl p-10 shadow-2xl z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg mb-4 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                        <span className="text-2xl font-black text-white italic">🛡️</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
                        Agent<span className="text-blue-500">Pay</span>
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">Gateway Financiero de Grado Militar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm text-center font-semibold flex items-center justify-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Identidad Digital</label>
                        <input
                            type="email"
                            required
                            className="w-full input-premium"
                            placeholder="nombre@empresa.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Llave de Acceso</label>
                        <input
                            type="password"
                            required
                            className="w-full input-premium"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-900/20 transform active:scale-[0.98] transition-all uppercase tracking-tighter overflow-hidden relative group"
                    >
                        <span className="relative z-10">Iniciar Secuenciación</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-15deg] group-hover:translate-x-[150%] transition-transform duration-700"></div>
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        ¿No tienes una interfaz?{' '}
                        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-colors underline decoration-blue-500/30 underline-offset-4">
                            Regístrate ahora
                        </Link>
                    </p>
                </div>
            </div>

            <div className="absolute bottom-8 text-[10px] text-gray-600 font-mono tracking-widest uppercase opacity-30">
                AgentShield Secure Core v2.0 // Port 3003
            </div>
        </div>
    );
}
