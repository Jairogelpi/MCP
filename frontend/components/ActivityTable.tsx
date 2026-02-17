'use client';

import React from 'react';
import { ErrorCode, ErrorCodeLabels } from '../lib/error_codes';

interface ActivityItem {
    id: string;
    timestamp: number;
    action: string;
    status: string;
    cost: number;
    error_code?: string;
    latency?: number;
    hash: string;
    envelope_hash?: string;
    policy_version?: string;
}

interface Props {
    activities: ActivityItem[];
}

export function ActivityTable({ activities }: Props) {
    return (
        <div className="glass overflow-hidden rounded-xl border border-white/5">
            <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-white/5 text-gray-200 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                        <th className="p-4">Time</th>
                        <th className="p-4">Action / Tool</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Policy v.</th>
                        <th className="p-4">Latency</th>
                        <th className="p-4">Cost</th>
                        <th className="p-4">Envelope Hash</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {activities.map(item => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-4 font-bold text-white max-w-[200px] truncate" title={item.action}>
                                {item.action}
                            </td>
                            <td className="p-4">
                                <ActivityStatus status={item.status} errorCode={item.error_code} />
                            </td>
                            <td className="p-4 font-mono text-[10px] text-indigo-400">
                                {item.policy_version || 'v1.0'}
                            </td>
                            <td className="p-4 font-mono text-xs">
                                {item.latency ? <span className={item.latency > 1000 ? 'text-yellow-400' : 'text-emerald-400'}>{item.latency}ms</span> : '-'}
                            </td>
                            <td className="p-4 font-mono text-xs text-blue-300">
                                {item.cost > 0 ? `€${item.cost.toFixed(4)}` : '-'}
                            </td>
                            <td className="p-4 font-mono text-[10px] text-gray-600 truncate max-w-[120px]" title={item.envelope_hash || item.hash}>
                                {item.envelope_hash ? `sha256:${item.envelope_hash.substring(0, 8)}...` : item.hash.substring(0, 12) + '...'}
                            </td>
                        </tr>
                    ))}
                    {activities.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-gray-600 uppercase text-xs tracking-widest">
                                No activity recorded yet
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ActivityStatus({ status, errorCode }: { status: string, errorCode?: string }) {
    if (status === 'success') {
        return <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase">Success</span>;
    }
    if (status === 'failed' || errorCode) {
        return (
            <div className="flex flex-col">
                <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit">Failed</span>
                {errorCode && (
                    <span className="text-[9px] text-red-300 mt-1 font-mono" title={ErrorCodeLabels[errorCode as ErrorCode] || errorCode}>
                        {errorCode}
                    </span>
                )}
            </div>
        );
    }
    return <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
}
