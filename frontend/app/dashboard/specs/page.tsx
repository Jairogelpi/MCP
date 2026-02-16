'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ContractViewer from '../../../components/ContractViewer';

const AVAILABLE_SPECS = [
    { id: 'action_envelope.md', title: 'Action Envelope (Core)', icon: '📦' },
    { id: 'proxy_api.md', title: 'Proxy API Contract', icon: '🌐' },
    { id: 'error_codes.md', title: 'Error Codes', icon: '🚨' },
    { id: 'policy_contract.md', title: 'Policy & ABAC', icon: '🛡️' }
];

export default function SpecsPage() {
    const [selectedSpec, setSelectedSpec] = useState(AVAILABLE_SPECS[0]);

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors">← Back</Link>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    System <span className="text-blue-500">Contracts</span>
                </h1>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full md:w-64 space-y-2">
                    {AVAILABLE_SPECS.map(spec => (
                        <button
                            key={spec.id}
                            onClick={() => setSelectedSpec(spec)}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors text-xs font-bold uppercase tracking-wide
                                ${selectedSpec.id === spec.id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span>{spec.icon}</span>
                            {spec.title}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <ContractViewer specFile={selectedSpec.id} />
                </div>
            </div>
        </div>
    );
}
