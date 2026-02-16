'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ContractViewerProps {
    specFile: string; // e.g., 'action_envelope.md' or 'proxy_api.md'
}

export default function ContractViewer({ specFile }: ContractViewerProps) {
    const [content, setContent] = useState<string>('Loading spec...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/spec/${specFile}`)
            .then(res => {
                if (!res.ok) throw new Error('Spec file not found');
                return res.text();
            })
            .then(text => setContent(text))
            .catch(err => {
                console.error(err);
                setError(`Failed to load ${specFile}`);
            });
    }, [specFile]);

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                ERROR: {error}
            </div>
        );
    }

    return (
        <div className="prose prose-sm max-w-none bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="mb-4 pb-2 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Core Contract Spec</span>
                <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded">v0.1.0</span>
            </div>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Style overrides for better contract readability
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3 border-b pb-1" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-md font-medium text-gray-700 mt-4 mb-2" {...props} />,
                    code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !className ? (
                            <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        )
                    },
                    pre: ({ node, ...props }) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-xs my-4" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-200 border" {...props} /></div>,
                    th: ({ node, ...props }) => <th className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r" {...props} />,
                    td: ({ node, ...props }) => <td className="px-3 py-2 text-sm text-gray-700 border-r border-t" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
