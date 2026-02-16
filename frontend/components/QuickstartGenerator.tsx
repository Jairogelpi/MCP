'use client';

import React, { useState } from 'react';

interface Props {
    tenantId: string;
    upstreamName?: string;
    apiKey?: string;
}

export function QuickstartGenerator({ tenantId, upstreamName = 'my-upstream', apiKey = 'sk_live_...' }: Props) {
    const [copied, setCopied] = useState(false);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin.replace('3001', '3000') : 'https://gateway.agentshield.com';
    const endpoint = `${baseUrl}/mcp/${tenantId}/${upstreamName}`;

    const snippet = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'`;

    const handleCopy = () => {
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Terminal Quickstart</span>
                <button
                    onClick={handleCopy}
                    className={`text-[10px] font-bold uppercase transition-colors ${copied ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-blue-300 leading-relaxed">
                    <code>
                        <span className="text-purple-400">curl</span> -X POST <span className="text-emerald-300">{endpoint}</span> \<br />
                        &nbsp;&nbsp;-H <span className="text-orange-300">"Authorization: Bearer <span className="blur-[2px] hover:blur-none transition-all duration-300">{apiKey}</span>"</span> \<br />
                        &nbsp;&nbsp;-H <span className="text-orange-300">"Content-Type: application/json"</span> \<br />
                        &nbsp;&nbsp;-d <span className="text-gray-400">'{'{'}</span><br />
                        &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">"jsonrpc"</span>: <span className="text-green-300">"2.0"</span>,<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">"method"</span>: <span className="text-green-300">"tools/list"</span>,<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">"params"</span>: <span className="text-gray-400">{'{}'}</span>,<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">"id"</span>: <span className="text-blue-400">1</span><br />
                        &nbsp;&nbsp;<span className="text-gray-400">{'}'}'</span>
                    </code>
                </pre>
            </div>
        </div>
    );
}
