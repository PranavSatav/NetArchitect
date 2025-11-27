
import React, { useState } from 'react';
import { NetworkNode } from '../types';
import { Edge } from 'reactflow';
import { findPath } from '../services/rules';
import { Send, X, ArrowRight, Activity } from 'lucide-react';

interface Props {
    nodes: NetworkNode[];
    edges: Edge[];
    onClose: () => void;
    onSimulate: (path: string[], success: boolean) => void;
}

export const PacketSimulator: React.FC<Props> = ({ nodes, edges, onClose, onSimulate }) => {
    const [source, setSource] = useState('');
    const [target, setTarget] = useState('');
    const [result, setResult] = useState<{message: string, success: boolean} | null>(null);

    const handleSimulate = () => {
        if(!source || !target) return;
        setResult(null); // Clear previous
        
        // Small fake delay for effect
        setTimeout(() => {
            const res = findPath(nodes, edges, source, target);
            setResult({ message: res.message, success: res.success });
            onSimulate(res.path, res.success);
        }, 300);
    };

    return (
        <div className="fixed top-20 right-4 w-80 bg-gray-900 border border-purple-500/50 shadow-2xl rounded-lg p-4 z-50 text-white backdrop-blur-md animate-in slide-in-from-right-5">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h3 className="font-bold text-purple-400 flex items-center gap-2"><Activity size={16}/> Traffic Simulator</h3>
                <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-white"/></button>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Source Device</label>
                    <select 
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs outline-none focus:border-purple-500 transition-colors"
                        value={source}
                        onChange={e => setSource(e.target.value)}
                    >
                        <option value="">Select Source...</option>
                        {nodes.map(n => <option key={n.id} value={n.id}>{n.data.label} {n.data.ip ? `(${n.data.ip})` : '[No IP]'}</option>)}
                    </select>
                </div>

                <div className="flex justify-center text-gray-600">
                    <ArrowRight size={16} className="rotate-90 md:rotate-0"/>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Destination Device</label>
                    <select 
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs outline-none focus:border-purple-500 transition-colors"
                        value={target}
                        onChange={e => setTarget(e.target.value)}
                    >
                        <option value="">Select Destination...</option>
                        {nodes.map(n => <option key={n.id} value={n.id}>{n.data.label} {n.data.ip ? `(${n.data.ip})` : '[No IP]'}</option>)}
                    </select>
                </div>

                <button 
                    onClick={handleSimulate}
                    disabled={!source || !target || source === target}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                >
                    <Send size={14} /> Send ICMP Packet
                </button>

                {result && (
                    <div className={`p-3 rounded text-xs mt-2 border-l-4 animate-in fade-in zoom-in-95 ${result.success ? 'bg-green-900/20 border-green-500 text-green-200' : 'bg-red-900/20 border-red-500 text-red-200'}`}>
                        <div className="font-bold mb-1">{result.success ? 'Success' : 'Failed'}</div>
                        {result.message}
                    </div>
                )}
            </div>
        </div>
    );
};
