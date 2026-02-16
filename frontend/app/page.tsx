'use client';

import Link from 'next/link';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-[#02040a] text-white selection:bg-blue-500/30">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">🛡️</div>
            <span className="text-xl font-black tracking-tighter italic uppercase">Agent<span className="text-blue-500">Pay</span></span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors">Panel de Control</Link>
                <button onClick={logout} className="text-[10px] font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10">Cerrar Sesión</button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-xs font-bold uppercase tracking-widest hover:text-blue-400 transition-colors">Acceder</Link>
                <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-6 py-2.5 rounded-xl uppercase transition-all shadow-lg shadow-blue-500/20">Empezar</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-44 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[150px] -z-10 animate-pulse"></div>
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Infraestructura Financiera Soberana
          </div>
          <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9]">
            El Futuro de la <span className="text-blue-600">Economía IA</span> es Determinista.
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
            AgentPay es la pasarela de gobernanza que otorga soberanía financiera a tus agentes, con auditoría criptográfica y límites en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            {user ? (
              <Link href="/dashboard" className="group relative bg-blue-600 hover:bg-blue-500 text-white font-black py-5 px-12 rounded-2xl text-xl shadow-2xl transition-all uppercase tracking-tighter flex items-center gap-3">
                Volver al Dashboard
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            ) : (
              <>
                <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-black py-5 px-12 rounded-2xl text-xl shadow-2xl transition-all uppercase tracking-tighter shimmer-effect">
                  Fundar Mi Bóveda
                </Link>
                <Link href="/login" className="glass hover:bg-white/5 text-white font-black py-5 px-12 rounded-2xl text-xl shadow-xl transition-all uppercase tracking-tighter border-white/10">
                  Acceso Seguro
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Progress Phases Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent to-[#05070a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Phase 0 */}
            <div className="glass p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-8xl font-black italic tracking-tighter uppercase">00</span>
              </div>
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl border border-blue-500/20">🛡️</div>
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Fase 0: Integridad</h3>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Chain of Custody</h2>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Implementación de un ledger inmutable basado en hashes de recibos. Cada céntimo reservado y liquidado es verificable matemáticamente.
              </p>
              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> Ledger Monitor Active
                </li>
                <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> Merkle-Light Proofs
                </li>
              </ul>
            </div>

            {/* Phase 1 */}
            <div className="glass p-10 rounded-[2.5rem] border-blue-600/30 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-8xl font-black italic tracking-tighter uppercase text-blue-600">01</span>
              </div>
              <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-3xl border border-blue-600/20">⚡</div>
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Fase 1: Multi-Tenancy</h3>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Sovereign Orgs</h2>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Aislamiento total de presupuestos por organización. Los administradores controlan el gasto global de su entidad sin interferencias.
              </p>
              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> Org Isolation Verified
                </li>
                <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> Real-Time Limits
                </li>
              </ul>
            </div>

            {/* Phase 2 */}
            <div className="glass p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden group border-indigo-500/20">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-indigo-500">
                <span className="text-8xl font-black italic tracking-tighter uppercase">02</span>
              </div>
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl border border-indigo-500/20">🧬</div>
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Fase 2: Gobernanza</h3>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Hierarchy Explorer</h2>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Control granular por departamentos y roles funcionales. Evaluación recursiva de presupuestos desde la herramienta hasta el inquilino.
              </p>
              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> Recursive Enforcement
                </li>
                <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> Dynamic Scoping
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-[#010205]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-gray-800 p-1 rounded">🛡️</div>
              <span className="text-white">AgentShield Protocol</span>
            </div>
            <p>V2.4.0-STABLE | DETERMINISTIC_CORE_01</p>
          </div>
          <div className="flex flex-wrap justify-center gap-12">
            <div className="space-y-2">
              <p className="text-blue-900">Seguridad</p>
              <p className="text-white">Zero-Heuristics</p>
            </div>
            <div className="space-y-2">
              <p className="text-indigo-900">Cloud</p>
              <p className="text-white">Obsidian Engine</p>
            </div>
          </div>
          <div className="text-right">
            Desarrollado para la Soberanía Artificial.
          </div>
        </div>
      </footer>
    </main>
  );
}
