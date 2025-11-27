
import React, { useState } from 'react';
import { NetworkNode, DeviceType } from '../types';
import { Edge } from 'reactflow';
import { Trophy, CheckCircle, ChevronRight, Terminal, HelpCircle, Loader2, ArrowRight, Play, Award, BrainCircuit } from 'lucide-react';

// Scenarios definition
const SCENARIOS = [
    {
        id: 1,
        title: "Mission 1: The Startup Office",
        difficulty: "Novice",
        color: "text-green-400",
        description: "A new startup 'TechNova' needs their office network set up. They have 1 Router, 1 Switch, and 2 PCs.",
        steps: [
            {
                title: "Physical Connectivity",
                task: "Connect: Router -> Switch -> Both PCs. Ensure all links are connected.",
                hint: "Drag a Router, a Switch (L2), and 2 PCs. Connect them using the handles.",
                check: (nodes: NetworkNode[], edges: Edge[]) => {
                    const routers = nodes.filter(n => n.data.type === DeviceType.ROUTER);
                    const switches = nodes.filter(n => n.data.type === DeviceType.SWITCH_L2);
                    const pcs = nodes.filter(n => n.data.type === DeviceType.PC);
                    
                    if (routers.length < 1 || switches.length < 1 || pcs.length < 2) return false;
                    return edges.length >= 3; // Minimal edges needed
                }
            },
            {
                title: "IP Addressing",
                task: "Assign IP addresses to both PCs in the same subnet (e.g., 192.168.1.10 and 192.168.1.11).",
                hint: "Select a PC, click 'Edit Details' in the top right, and enter an IP like 192.168.1.10.",
                check: (nodes: NetworkNode[]) => {
                    const pcs = nodes.filter(n => n.data.type === DeviceType.PC);
                    const ips = pcs.map(p => p.data.ip).filter(ip => ip && ip.startsWith('192.168.1.'));
                    return ips.length >= 2;
                }
            },
            {
                title: "Gateway Configuration",
                task: "Configure the Router's IP to be the Gateway (e.g., 192.168.1.1).",
                hint: "Select the Router, set IP to 192.168.1.1. This acts as the exit door for the network.",
                check: (nodes: NetworkNode[]) => {
                     const router = nodes.find(n => n.data.type === DeviceType.ROUTER);
                     return !!(router && router.data.ip);
                }
            },
            {
                title: "VLAN Setup (Bonus)",
                task: "Use the CLI on the Switch to create VLAN 10.",
                hint: "Select Switch -> CLI -> Type 'enable' -> 'conf t' -> 'vlan 10'.",
                check: (nodes: NetworkNode[]) => {
                    return nodes.some(n => n.data.vlanDb && n.data.vlanDb[10]);
                }
            }
        ]
    },
    {
        id: 2,
        title: "Mission 2: Department Separation",
        difficulty: "Hard",
        color: "text-orange-400",
        description: "Separate the Sales and Engineering departments using VLANs. They shouldn't be in the same broadcast domain.",
        steps: [
            {
                title: "Setup Devices",
                task: "Place a Switch and 2 PCs. One for Sales, one for Eng.",
                hint: "Use the catalog to drag devices.",
                check: (nodes: NetworkNode[]) => {
                    const pcs = nodes.filter(n => n.data.type === DeviceType.PC);
                    const sw = nodes.filter(n => n.data.type === DeviceType.SWITCH_L2);
                    return pcs.length >= 2 && sw.length >= 1;
                }
            },
            {
                title: "VLAN Configuration",
                task: "Configure VLAN 10 (Sales) and VLAN 20 (Eng) on the switch using CLI.",
                hint: "CLI: 'vlan 10', then 'name Sales', then 'exit'. Do the same for 'vlan 20'.",
                check: (nodes: NetworkNode[]) => {
                    return nodes.some(n => n.data.vlanDb && n.data.vlanDb[10] && n.data.vlanDb[20]);
                }
            },
            {
                title: "Assign Ports",
                task: "Assign PC1 to VLAN 10 and PC2 to VLAN 20 using interface commands.",
                hint: "CLI: 'int g0/1' -> 'switchport access vlan 10'. Note: Check which port corresponds to which PC by looking at the cables.",
                check: (nodes: NetworkNode[]) => {
                    const v10 = nodes.some(n => n.data.assignedVlan === 10);
                    const v20 = nodes.some(n => n.data.assignedVlan === 20);
                    return v10 && v20;
                }
            }
        ]
    },
    {
        id: 3,
        title: "Mission 3: Data Center Ops",
        difficulty: "Pro",
        color: "text-red-500",
        description: "Build a Spine-Leaf topology. Redundancy is key.",
        steps: [
            {
                title: "Spine & Leaf",
                task: "Deploy 2 L3 Switches (Spines) and 2 L2 Switches (Leaves).",
                hint: "Catalog -> L3 Switch / L2 Switch.",
                check: (nodes: NetworkNode[]) => {
                    const l3 = nodes.filter(n => n.data.type === DeviceType.SWITCH_L3);
                    const l2 = nodes.filter(n => n.data.type === DeviceType.SWITCH_L2);
                    return l3.length >= 2 && l2.length >= 2;
                }
            },
            {
                title: "Full Mesh Cabling",
                task: "Connect every Leaf to every Spine. (2 Leaves x 2 Spines = 4 Links).",
                hint: "Draw cables from Leaf 1 to Spine 1 & 2. Leaf 2 to Spine 1 & 2.",
                check: (nodes: NetworkNode[], edges: Edge[]) => {
                    // Simplified check: Just ensure we have enough links between L2 and L3 devices
                    let crossLinks = 0;
                    edges.forEach(e => {
                        const source = nodes.find(n => n.id === e.source);
                        const target = nodes.find(n => n.id === e.target);
                        if ((source?.data.type === DeviceType.SWITCH_L3 && target?.data.type === DeviceType.SWITCH_L2) ||
                            (source?.data.type === DeviceType.SWITCH_L2 && target?.data.type === DeviceType.SWITCH_L3)) {
                            crossLinks++;
                        }
                    });
                    return crossLinks >= 4;
                }
            }
        ]
    }
];

export const ChallengePanel = ({ nodes, edges, onComplete }: { nodes: NetworkNode[], edges: Edge[], onComplete: () => void }) => {
    const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
    const [stepIdx, setStepIdx] = useState(0);
    const [isChecking, setIsChecking] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const activeScenario = SCENARIOS.find(s => s.id === selectedScenarioId);
    
    // Mission Select Screen
    if (!activeScenario) {
        return (
            <div className="absolute top-20 left-4 bg-gray-900/95 backdrop-blur border border-yellow-600/50 p-5 rounded-xl shadow-2xl w-80 z-40 animate-in slide-in-from-left-5">
                <div className="flex items-center gap-2 text-yellow-500 font-bold uppercase tracking-widest text-xs mb-4 border-b border-gray-700 pb-2">
                    <Trophy size={16} /> Mission Select
                </div>
                <div className="space-y-3">
                    {SCENARIOS.map(scenario => (
                        <button 
                            key={scenario.id}
                            onClick={() => { setSelectedScenarioId(scenario.id); setStepIdx(0); setErrorMsg(''); }}
                            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-lg p-3 text-left transition-all group"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold ${scenario.color}`}>{scenario.difficulty}</span>
                                <ChevronRight size={14} className="text-gray-500 group-hover:text-white"/>
                            </div>
                            <div className="font-bold text-sm text-gray-200">{scenario.title}</div>
                            <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">{scenario.description}</div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const currentStep = activeScenario.steps[stepIdx];

    const verify = () => {
        setIsChecking(true);
        setErrorMsg('');
        setShowHint(false);

        // Simulate "Checking" delay for realism
        setTimeout(() => {
            const passed = currentStep.check(nodes, edges);
            
            if (passed) {
                if (stepIdx < activeScenario.steps.length - 1) {
                    setStepIdx(prev => prev + 1);
                } else {
                    onComplete();
                    setSelectedScenarioId(null); // Return to menu on complete
                }
            } else {
                setErrorMsg("Verification Failed. Check the requirements!");
            }
            setIsChecking(false);
        }, 800);
    };

    return (
        <div className="absolute top-20 left-4 bg-gray-900/95 backdrop-blur border border-yellow-600/50 p-5 rounded-xl shadow-2xl w-80 z-40 animate-in slide-in-from-left-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-4">
                <button 
                    onClick={() => setSelectedScenarioId(null)} 
                    className="text-gray-400 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"
                >
                    &larr; Back
                </button>
                <div className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-400">
                    Step {stepIdx + 1}/{activeScenario.steps.length}
                </div>
            </div>

            {/* Scenario Info */}
            <h3 className="font-bold text-white text-md mb-1">{activeScenario.title}</h3>
            <p className="text-xs text-gray-400 mb-4 italic">{activeScenario.description}</p>

            {/* Current Step Card */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-4">
                <div className="flex items-center gap-2 mb-2 text-blue-400 text-sm font-bold">
                    <ArrowRight size={14} /> Current Objective
                </div>
                <div className="text-sm text-gray-200 font-medium mb-1">
                    {currentStep.title}
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">
                    {currentStep.task}
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <button 
                    onClick={verify}
                    disabled={isChecking}
                    className={`w-full py-2.5 font-bold rounded shadow-lg text-xs flex justify-center items-center gap-2 transition-all 
                    ${isChecking ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-yellow-600 hover:bg-yellow-500 text-white transform hover:scale-[1.02]'}`}
                >
                    {isChecking ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                    {isChecking ? 'Verifying Topology...' : 'Verify Objective'}
                </button>

                {errorMsg && (
                    <div className="text-center text-xs text-red-400 font-bold bg-red-900/20 py-2 rounded animate-pulse">
                        {errorMsg}
                    </div>
                )}

                <div className="flex justify-center">
                    <button 
                        onClick={() => setShowHint(!showHint)}
                        className="text-[10px] text-gray-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                    >
                        <HelpCircle size={10} /> {showHint ? 'Hide Hint' : 'Stuck? Get a Hint'}
                    </button>
                </div>

                {showHint && (
                    <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded text-xs text-blue-200 mt-2 animate-in fade-in">
                        <span className="font-bold">Hint:</span> {currentStep.hint}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mt-4 flex gap-1">
                {activeScenario.steps.map((_, i) => (
                    <div 
                        key={i} 
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= stepIdx ? 'bg-yellow-500' : 'bg-gray-700'}`} 
                    />
                ))}
            </div>
        </div>
    );
};
