'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [testState, setTestState] = useState<'idle' | 'validating' | 'sending' | 'received'>('idle');
    const { register, user } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const res = await register(email, name, password);
        if (res.success) {
            setIsReady(true);
        } else {
            setError(res.error || 'Error en la sincronización');
        }
    };

    const handleRunTest = async () => {
        setTestState('validating');
        await new Promise(r => setTimeout(r, 800));
        setTestState('sending');
        await new Promise(r => setTimeout(r, 1200));
        setTestState('received');
        setTimeout(() => router.push('/dashboard'), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>

            <div className={`w-full ${isReady ? 'max-w-2xl' : 'max-w-md'} glass rounded-3xl p-10 shadow-2xl z-10 transition-all duration-500`}>
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg mb-4 transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                        <span className="text-2xl font-black text-white italic">{isReady ? '🏛️' : '🚀'}</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
                        Agent<span className="text-blue-500">{isReady ? 'Shield' : 'Pay'}</span> {isReady ? 'Ready' : 'Register'}
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">
                        {isReady ? 'Tu Plano de Control ha sido aprovisionado.' : 'Configura tu Bóveda Financiera'}
                    </p>
                </div>

                {isReady && user ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Bootstrap Matrix</h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Tenant ID</span>
                                        <code className="text-xs text-blue-300 font-mono">{user.tenantId}</code>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Environment</span>
                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase">Production</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Primary Agent</span>
                                        <span className="text-xs text-white font-black italic">Autonomous Core</span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Master API Key</span>
                                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                                            <code className="text-[10px] text-gray-400 break-all">{user.token}</code>
                                            <span className="text-xs">🔑</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleRunTest}
                                disabled={testState !== 'idle'}
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-tighter italic transition-all shadow-xl ${testState === 'idle'
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                                    : 'bg-green-600/20 text-green-400 border border-green-500/30'
                                    }`}
                            >
                                {testState === 'idle' ? 'Run Activation Test' : 'Test in Progress...'}
                            </button>
                        </div>

                        <div className="bg-black/40 rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                                {testState !== 'idle' && (
                                    <div className={`h-full bg-blue-500 transition-all duration-[2000ms] ${testState === 'received' ? 'w-full' : 'w-1/2'}`}></div>
                                )}
                            </div>

                            <div className="flex flex-col items-center gap-6 w-full max-w-[200px]">
                                <div className={`flex items-center gap-3 w-full transition-all ${testState === 'validating' || testState === 'sending' || testState === 'received' ? 'opacity-100' : 'opacity-20'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${testState !== 'idle' ? 'border-blue-500 text-blue-500' : 'border-white/20'}`}>1</div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Validated</span>
                                </div>
                                <div className={`flex items-center gap-3 w-full transition-all ${testState === 'sending' || testState === 'received' ? 'opacity-100' : 'opacity-20'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${testState === 'sending' || testState === 'received' ? 'border-blue-500 text-blue-500' : 'border-white/20'}`}>2</div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Sent</span>
                                </div>
                                <div className={`flex items-center gap-3 w-full transition-all ${testState === 'received' ? 'opacity-100' : 'opacity-20'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${testState === 'received' ? 'border-green-500 text-green-500' : 'border-white/20'}`}>3</div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Received</span>
                                </div>
                            </div>

                            {testState === 'received' && (
                                <div className="text-center animate-bounce mt-4">
                                    <span className="text-xs font-black text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 uppercase tracking-tighter">
                                        Success: 200 OK
                                    </span>
                                </div>
                            )}

                            {testState === 'idle' && (
                                <p className="text-[10px] text-gray-500 text-center font-medium italic">
                                    Click para verificar el túnel Gateway -&gt; Echo Service
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm text-center font-semibold flex items-center justify-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Alias del Operador</label>
                            <input
                                type="text"
                                required
                                className="w-full input-premium"
                                placeholder='John "Guardian" Doe'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Canal de Comunicación</label>
                            <input
                                type="email"
                                required
                                className="w-full input-premium"
                                placeholder="usuario@tuempresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Código de Encriptación</label>
                            <input
                                type="password"
                                required
                                className="w-full input-premium"
                                placeholder="Mínimo 8 fragmentos"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-900/20 transform active:scale-[0.98] transition-all uppercase tracking-tighter overflow-hidden relative group"
                        >
                            <span className="relative z-10">Desplegar Identidad</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-15deg] group-hover:translate-x-[150%] transition-transform duration-700"></div>
                        </button>
                    </form>
                )}

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        ¿Ya posees acceso?{' '}
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors underline decoration-blue-500/30 underline-offset-4">
                            Regresar a Base
                        </Link>
                    </p>
                </div>
            </div>

            <div className="absolute bottom-8 text-[10px] text-gray-600 font-mono tracking-widest uppercase opacity-30 text-center w-full">
                Protocolo AgentShield // Encriptación de Grado Financiero
            </div>
        </div>
    );
}
