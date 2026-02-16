'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../app/context/AuthContext';
import { validateEnvelope } from '../lib/contract_validation';
import { ErrorCode } from '../lib/error_codes';

interface Props {
    tenantId: string;
    upstreams: Array<{ name: string, base_url: string }>;
    apiKeys: Array<{ key_id: string, secret?: string }>; // Secret only available if just created, otherwise user must provide
}

export function Playground({ tenantId, upstreams, apiKeys }: Props) {
    const { user } = useAuth();
    const [selectedUpstream, setSelectedUpstream] = useState(upstreams[0]?.name || '');
    const [customKey, setCustomKey] = useState('');

    // Default valid envelope structure based on schema
    const [requestBody, setRequestBody] = useState(JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
            name: "get_weather",
            arguments: { city: "Madrid" }
        },
        id: 1
    }, null, 2));

    const [validation, setValidation] = useState<{ valid: boolean, errors: string[] }>({ valid: true, errors: [] });
    const [logs, setLogs] = useState<Array<{ type: 'info' | 'error' | 'chunk' | 'receipt', content: any, time: number }>>([]);
    const [loading, setLoading] = useState(false);

    // Auto-validate on change
    useEffect(() => {
        try {
            const parsed = JSON.parse(requestBody);
            const res = validateEnvelope(parsed);
            setValidation(res);
        } catch (e) {
            setValidation({ valid: false, errors: ['Invalid JSON syntax'] });
        }
    }, [requestBody]);

    const addLog = (type: 'info' | 'error' | 'chunk' | 'receipt', content: any) => {
        setLogs(prev => [...prev, { type, content, time: Date.now() }]);
    };

    const [transportMode, setTransportMode] = useState<'http' | 'sse'>('http');

    // Templates for quick testing
    const loadTemplate = (type: 'list_tools' | 'call_tool' | 'streaming') => {
        let template = {};
        if (type === 'list_tools') {
            template = {
                jsonrpc: "2.0",
                method: "tools/list",
                params: {},
                id: Date.now()
            };
        } else if (type === 'call_tool') {
            template = {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "get_weather",
                    arguments: { city: "Madrid" }
                },
                id: Date.now()
            };
        } else if (type === 'streaming') {
            setTransportMode('sse');
            template = {
                jsonrpc: "2.0",
                method: "sampling/createMessage",
                params: {
                    messages: [{ role: "user", content: "Tell me a long story about finance." }],
                    maxTokens: 100
                },
                id: Date.now()
            };
        }
        setRequestBody(JSON.stringify(template, null, 2));
    };

    const generateCurl = () => {
        const endpoint = `${window.location.origin.replace('3001', '3000')}/mcp/${tenantId}/${selectedUpstream}`;
        const cmd = `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer ${customKey || 'sk_...'}" \\\n  -H "Content-Type: application/json" \\\n  ${transportMode === 'sse' ? '-H "Accept: text/event-stream" \\' : ''}\n  -d '${requestBody}'`;
        navigator.clipboard.writeText(cmd);
        addLog('info', 'Curl command copied to clipboard!');
    };

    const handleSend = async () => {
        if (!validation.valid) {
            addLog('error', 'Request blocked by Client-Side Contract Validation.');
            return;
        }

        setLoading(true);
        setLogs([]); // Clear previous
        addLog('info', `Initializing ${transportMode.toUpperCase()} request to /mcp/${tenantId}/${selectedUpstream}...`);

        try {
            const endpoint = `http://localhost:3000/mcp/${tenantId}/${selectedUpstream}`;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customKey || 'sk_replace_me'}`
            };

            if (transportMode === 'sse') {
                headers['Accept'] = 'text/event-stream';
            }

            addLog('info', 'Opening connection...');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: requestBody
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    addLog('error', `HTTP ${response.status}: ${errorJson.error?.message || errorJson.error || 'Unknown Error'}`);
                } catch {
                    addLog('error', `HTTP ${response.status}: ${errorText}`);
                }
                setLoading(false);
                return;
            }

            // If SSE, read stream
            if (transportMode === 'sse' || response.headers.get('content-type')?.includes('text/event-stream')) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.replace('data: ', '').trim();
                                if (dataStr === '[DONE]') {
                                    addLog('info', 'Stream closed by server.');
                                    continue;
                                }
                                try {
                                    const data = JSON.parse(dataStr);
                                    if (data.receipt) {
                                        addLog('receipt', data.receipt);
                                    } else {
                                        addLog('chunk', data);
                                    }
                                } catch {
                                    addLog('chunk', dataStr);
                                }
                            }
                        }
                    }
                }
            } else {
                // Standard HTTP JSON
                const data = await response.json();
                addLog('info', data);
                if (data.id) addLog('info', `Request ID: ${data.id} completed.`);
            }

        } catch (err: any) {
            addLog('error', `Network Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
            {/* Left: Configuration & Input */}
            <div className="flex flex-col gap-4 h-full">
                <div className="glass p-6 rounded-2xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Upstream</label>
                            <select
                                className="input-premium w-full"
                                value={selectedUpstream}
                                onChange={e => setSelectedUpstream(e.target.value)}
                            >
                                {upstreams.map(u => (
                                    <option key={u.name} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">API Key (Mock/Real)</label>
                            <input
                                type="password"
                                className="input-premium w-full"
                                placeholder="Paste sk_..."
                                value={customKey}
                                onChange={e => setCustomKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Upstream</label>
                            <select
                                className="input-premium w-full"
                                value={selectedUpstream}
                                onChange={e => setSelectedUpstream(e.target.value)}
                            >
                                {upstreams.map(u => (
                                    <option key={u.name} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Transport Mode</label>
                            <div className="flex bg-[#0a0c10] rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => setTransportMode('http')}
                                    className={`flex-1 text-[10px] font-bold uppercase rounded py-1 transition-colors ${transportMode === 'http' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    HTTP
                                </button>
                                <button
                                    onClick={() => setTransportMode('sse')}
                                    className={`flex-1 text-[10px] font-bold uppercase rounded py-1 transition-colors ${transportMode === 'sse' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    SSE
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Templates</label>
                            <button onClick={generateCurl} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase">Copy as Curl</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => loadTemplate('list_tools')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase text-gray-300 border border-white/5">
                                🛠️ List Tools
                            </button>
                            <button onClick={() => loadTemplate('call_tool')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase text-gray-300 border border-white/5">
                                📞 Call Tool
                            </button>
                            <button onClick={() => loadTemplate('streaming')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase text-gray-300 border border-white/5">
                                🌊 Streaming
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 glass p-0 rounded-2xl flex flex-col overflow-hidden border border-white/5 relative">
                    <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payload Editor (JSON-RPC 2.0)</span>
                        <div className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] uppercase font-bold ${validation.valid ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                            {validation.valid ? '✔ Schema Valid' : '✘ Invalid Schema'}
                        </div>
                    </div>
                    <textarea
                        className={`flex-1 w-full bg-[#0f111a] p-4 font-mono text-xs outline-none resize-none ${validation.valid ? 'text-gray-300' : 'text-pink-300'}`}
                        value={requestBody}
                        onChange={e => setRequestBody(e.target.value)}
                        spellCheck={false}
                    />
                    {!validation.valid && (
                        <div className="bg-red-900/20 border-t border-red-500/20 p-2 max-h-32 overflow-y-auto">
                            {validation.errors.map((err, i) => (
                                <p key={i} className="text-[10px] font-mono text-red-400">Error: {err}</p>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={handleSend}
                        disabled={!validation.valid || loading || !selectedUpstream}
                        className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {loading ? 'Processing...' : 'SEND REQUEST ▶'}
                    </button>
                </div>
            </div>

            {/* Right: Live Execution Trace */}
            <div className="glass p-0 rounded-2xl flex flex-col overflow-hidden border border-white/5 h-full">
                <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Execution Trace</span>
                    <button onClick={() => setLogs([])} className="text-[10px] text-gray-500 hover:text-white uppercase">Clear</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs scroll-smooth bg-[#0a0c10]">
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2 opacity-50">
                            <div className="text-4xl">⚡</div>
                            <p className="uppercase tracking-widest font-bold">Ready to Trace</p>
                        </div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className={`p-3 rounded border animate-in fade-in slide-in-from-bottom-2 duration-300
                            ${log.type === 'info' ? 'bg-blue-900/10 border-blue-500/10 text-blue-300' :
                                log.type === 'error' ? 'bg-red-900/10 border-red-500/20 text-red-400' :
                                    log.type === 'receipt' ? 'bg-emerald-900/10 border-emerald-500/30 text-emerald-300' :
                                        'bg-gray-800/30 border-white/5 text-gray-300 border-l-4 border-l-purple-500' // chunk
                            }`}>
                            <div className="flex justify-between items-start mb-1 opacity-50 text-[10px]">
                                <span className="uppercase font-bold">{log.type}</span>
                                <span>{new Date(log.time).toISOString().split('T')[1].replace('Z', '')}</span>
                            </div>
                            {log.type === 'receipt' ? (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">🧾</span>
                                        <span className="font-bold uppercase tracking-wider text-emerald-400">Cryptographic Receipt</span>
                                    </div>
                                    <pre className="whitespace-pre-wrap overflow-x-auto text-[10px] opacity-80">
                                        {JSON.stringify(log.content, null, 2)}
                                    </pre>
                                </div>
                            ) : (
                                <pre className="whitespace-pre-wrap overflow-x-auto">
                                    {typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-center py-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75 mx-1"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
