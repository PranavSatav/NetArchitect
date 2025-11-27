import React, { useState } from 'react';
import { NetworkNode } from '../types';
import { Edge } from 'reactflow';
import { getAIAssistantResponse } from '../services/geminiService';
import { MessageSquare, Send, Bot, X } from 'lucide-react';

export const AIAssistant = ({ nodes, edges }: { nodes: NetworkNode[], edges: Edge[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [chat, setChat] = useState<{role: 'user'|'ai', msg: string}[]>([{role: 'ai', msg: 'Hi! I am your AI Network Architect. Ask me anything about your current topology!'}]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!query.trim()) return;
        const userMsg = query;
        setChat(prev => [...prev, {role: 'user', msg: userMsg}]);
        setQuery('');
        setLoading(true);

        const context = JSON.stringify({ 
            nodes: nodes.map(n => n.data.label + ' ' + n.data.type), 
            edgeCount: edges.length 
        });
        
        const response = await getAIAssistantResponse(userMsg, context);
        
        setChat(prev => [...prev, {role: 'ai', msg: response}]);
        setLoading(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform hover:bg-blue-500 text-white"
                >
                    <Bot size={28} />
                </button>
            )}

            {isOpen && (
                <div className="w-80 h-96 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10">
                    <div className="bg-blue-900/30 p-3 border-b border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold text-gray-200 text-sm">
                            <Bot size={16} className="text-blue-400"/> AI Architect
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><X size={16}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                        {chat.map((c, i) => (
                            <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-2 rounded-lg text-xs ${c.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-300 rounded-bl-none'}`}>
                                    {c.msg}
                                </div>
                            </div>
                        ))}
                        {loading && <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>}
                    </div>

                    <div className="p-3 bg-gray-800/50 flex gap-2">
                        <input 
                            className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 text-xs text-white focus:border-blue-500 outline-none"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="How can I improve redundancy?"
                        />
                        <button onClick={handleSend} className="p-2 bg-blue-600 rounded text-white hover:bg-blue-500">
                            <Send size={14}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
