
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  Edge,
  Background,
  Controls,
  Panel,
  ReactFlowInstance,
  OnNodesDelete,
  Node,
  BackgroundVariant
} from 'reactflow';

import { Sidebar } from './components/Sidebar';
import { NetworkDeviceNode } from './components/CustomNodes';
import { TerminalWindow } from './components/TerminalWindow';
import { PacketSimulator } from './components/PacketSimulator';
import { AIAssistant } from './components/AIAssistant';
import { ChallengePanel } from './components/ChallengePanel';
import { analyzeNetwork, analyzeSecurity } from './services/geminiService';
import { validateConnection } from './services/rules';
import { INITIAL_NODES, NETWORK_TEMPLATES } from './constants';
import { TerminalState, DeviceType, AISuggestion, NetworkNode, SecurityAnalysisResult, InterfaceConfig } from './types';
import { Terminal, Wand2, Plus, Info, Building, Activity, Network, ShieldAlert, XCircle, AlertTriangle, PlayCircle, Settings, Globe, Save, Upload, Gamepad2, Edit3, Trash2 } from 'lucide-react';

const nodeTypes = {
  networkNode: NetworkDeviceNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

// Toast Notification Component
const Toast = ({ message, type, onClose }: { message: string, type: 'warning' | 'info' | 'error', onClose: () => void }) => (
  <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-4 rounded-lg shadow-2xl z-[60] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 border-l-4 backdrop-blur-md
    ${type === 'warning' ? 'bg-orange-950/90 border-orange-500 text-orange-200' : 
      type === 'error' ? 'bg-red-950/90 border-red-500 text-red-200' : 
      'bg-blue-950/90 border-blue-500 text-blue-200'}`}>
    {type === 'warning' ? <AlertTriangle size={24} /> : type === 'error' ? <XCircle size={24} /> : <Info size={24} />}
    <div>
       <div className="font-bold text-sm uppercase mb-1">{type}</div>
       <div className="text-sm font-medium">{message}</div>
    </div>
    <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100"><XCircle size={16}/></button>
  </div>
);

const App = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [nodes, setNodes] = useState<NetworkNode[]>(
    INITIAL_NODES.map(n => ({
      ...n, 
      data: {
        ...n.data, 
        floor: 'Server Room',
        status: n.data.status as 'up' | 'down' | 'booting'
      }
    }))
  );
  const [edges, setEdges] = useState<Edge[]>([]);
  
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Floor Management
  const [floors, setFloors] = useState(['Server Room', 'Floor 1', 'Branch Office']);
  const [currentFloor, setCurrentFloor] = useState('Server Room');
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [newFloorName, setNewFloorName] = useState('');
  
  // Selection State
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'warning' | 'info' | 'error'} | null>(null);

  // Terminal State
  const [terminalState, setTerminalState] = useState<TerminalState>({
    isOpen: false,
    nodeId: null,
    history: [],
    hostname: 'Router',
    mode: '>'
  });

  // AI Assistant State
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Security Analysis State
  const [isScanning, setIsScanning] = useState(false);
  const [securityReport, setSecurityReport] = useState<SecurityAnalysisResult | null>(null);
  
  // Simulation & Modes
  const [showPacketSim, setShowPacketSim] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showQuickConfig, setShowQuickConfig] = useState(false);
  const [tempIp, setTempIp] = useState('');
  const [tempLabel, setTempLabel] = useState('');
  const [gameMode, setGameMode] = useState(false);

  // Clear toast after delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Update temp IP/Label when selecting a node
  useEffect(() => {
    if (selectedNode) {
        setTempIp(selectedNode.data.ip || '');
        setTempLabel(selectedNode.data.label);
        setShowQuickConfig(false);
    }
  }, [selectedNode]);

  const visibleNodes = useMemo(() => 
    nodes.filter(n => n.data.floor === currentFloor || !n.data.floor), 
  [nodes, currentFloor]);

  const visibleEdges = useMemo(() => {
    const nodeIds = new Set(visibleNodes.map(n => n.id));
    return edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => {
          const sourceNode = nodes.find(n => n.id === e.source);
          const targetNode = nodes.find(n => n.id === e.target);
          
          // Check for SHUTDOWN interfaces to visualize broken links
          // Simplified logic: If any interface on source or target is shut down, assume this link is down
          // (In a real app, we'd map edges to specific interface names)
          const isShutdown = Object.values(sourceNode?.data.interfaces || {}).some((i) => (i as InterfaceConfig).shutdown) || 
                             Object.values(targetNode?.data.interfaces || {}).some((i) => (i as InterfaceConfig).shutdown);

          let stroke = '#3b82f6';
          let strokeWidth = 2;
          let strokeDasharray = '';

          if (isShutdown) {
              stroke = '#ef4444'; // Red for shutdown
              strokeDasharray = '5 5';
          }

          // If traffic is shown, color code by VLAN
          if (showTraffic && !isShutdown) {
              // Determine VLAN Color from node assignment
              const vlan = sourceNode?.data.assignedVlan || targetNode?.data.assignedVlan;
              
              if (vlan === 10) stroke = '#f97316'; // Orange
              else if (vlan === 20) stroke = '#a855f7'; // Purple
              else if (vlan === 30) stroke = '#ec4899'; // Pink
              else if (vlan === 99) stroke = '#ef4444'; // Red (Native/Mgmt)
              
              if (vlan) strokeWidth = 3;
          }
          
          return { ...e, style: { ...e.style, stroke, strokeWidth, strokeDasharray } };
      });
  }, [edges, visibleNodes, showTraffic, nodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (sourceNode && targetNode) {
        const validation = validateConnection(sourceNode.data.type, targetNode.data.type);
        
        if (validation.message) {
          setToast({
             message: validation.message,
             type: validation.level || 'info'
          });
        }

        if (validation.isValid) {
          setEdges((eds) => addEdge({ 
            ...params, 
            animated: showTraffic, 
            style: { stroke: validation.level === 'warning' ? '#f97316' : '#3b82f6', strokeWidth: 2 } 
          }, eds));
        }
      }
    },
    [setEdges, showTraffic, nodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow/type');
      const deviceType = event.dataTransfer.getData('application/reactflow/deviceType') as DeviceType;
      const label = event.dataTransfer.getData('application/reactflow/label');

      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: NetworkNode = {
        id: getId(),
        type,
        position,
        data: { 
          label: `${label} ${id}`, 
          type: deviceType, 
          status: 'up',
          floor: currentFloor 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, currentFloor]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as NetworkNode);
  }, []);

  const onNodesDelete: OnNodesDelete = useCallback((deleted) => {
     setEdges((eds) => eds.filter(e => !deleted.some(d => d.id === e.source || d.id === e.target)));
     setSelectedNode(null);
  }, [setEdges]);

  const loadTemplate = (templateName: string) => {
    if (NETWORK_TEMPLATES[templateName]) {
      const template = NETWORK_TEMPLATES[templateName](currentFloor);
      setNodes((curr) => [...curr, ...template.nodes]);
      setEdges((curr) => [...curr, ...template.edges]);
      setToast({ message: "Network Template Deployed Successfully", type: 'info' });
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setSecurityReport(null);
    const results = await analyzeNetwork(nodes, edges);
    setSuggestions(results);
    setIsAnalyzing(false);
  };

  const runSecurityScan = async () => {
    setIsScanning(true);
    setSuggestions([]);
    
    // Reset vulnerable state
    setNodes(nds => nds.map(n => ({...n, data: {...n.data, isVulnerable: false}})));

    const result = await analyzeSecurity(nodes, edges);
    setSecurityReport(result);
    
    // Highlight vulnerable nodes
    if (result.vulnerableNodeIds.length > 0) {
       setNodes(nds => nds.map(n => {
         if (result.vulnerableNodeIds.includes(n.id)) {
           return {...n, data: {...n.data, isVulnerable: true}};
         }
         return n;
       }));

       // Automatically clear red status after 10 seconds
       setTimeout(() => {
           setNodes(nds => nds.map(n => ({...n, data: {...n.data, isVulnerable: false}})));
           setToast({ message: "Visual security indicators cleared.", type: 'info' });
       }, 10000);
    }
    setIsScanning(false);
  };

  const toggleTraffic = () => {
    setShowTraffic(!showTraffic);
    setEdges(eds => eds.map(e => ({...e, animated: !showTraffic})));
  };

  const handlePacketSimulate = (path: string[], success: boolean) => {
    // Determine color based on success
    const strokeColor = success ? '#10b981' : '#ef4444'; // Green or Red

    if (path.length > 0) {
       setEdges(eds => eds.map(e => {
         // Check if edge connects two nodes in the path
         const isPathEdge = path.some((nodeId, idx) => {
            if (idx === path.length - 1) return false;
            const nextNode = path[idx + 1];
            return (e.source === nodeId && e.target === nextNode) || (e.source === nextNode && e.target === nodeId);
         });
         
         return isPathEdge 
           ? { ...e, animated: true, style: { ...e.style, stroke: strokeColor, strokeWidth: 4 } } 
           : { ...e, animated: false, style: { ...e.style, stroke: '#3b82f6', strokeWidth: 1 } };
       }));

       setTimeout(() => {
         // Reset styles after animation
         setEdges(eds => eds.map(e => ({ ...e, animated: showTraffic, style: { stroke: '#3b82f6', strokeWidth: 2 } })));
       }, 3000);
    }
  };

  const toggleIspFailover = (nodeId: string) => {
      setNodes(nds => nds.map(n => {
          if (n.id === nodeId) {
              return { ...n, data: { ...n.data, status: n.data.status === 'up' ? 'down' : 'up' } };
          }
          return n;
      }));
  };

  const saveConfig = () => {
      if (selectedNode) {
          setNodes(nds => nds.map(n => {
              if (n.id === selectedNode.id) {
                  return { ...n, data: { ...n.data, ip: tempIp, label: tempLabel } };
              }
              return n;
          }));
          setShowQuickConfig(false);
          setToast({ message: `Configuration saved for ${tempLabel}`, type: 'info' });
      }
  };

  const openTerminal = useCallback(() => {
    if (selectedNode) {
      setTerminalState({
        isOpen: true,
        nodeId: selectedNode.id,
        history: [], // Reset history for clean view
        hostname: selectedNode.data.label.replace(/\s+/g, '-'),
        mode: '>'
      });
    }
  }, [selectedNode]);

  // Save & Load Functionality
  const saveTopology = () => {
      const data = { nodes, edges, floors };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topology-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const loadTopology = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
             const data = JSON.parse(evt.target?.result as string);
             if (data.nodes && data.edges) {
                 setNodes(data.nodes);
                 setEdges(data.edges);
                 if (data.floors) setFloors(data.floors);
                 setToast({ message: "Topology Loaded Successfully", type: 'info' });
             }
          } catch (err) {
             setToast({ message: "Failed to load topology file", type: 'error' });
          }
      };
      reader.readAsText(file);
  };

  // Floor Functions
  const addFloor = () => {
      const name = `New Floor ${floors.length}`;
      setFloors([...floors, name]);
      setCurrentFloor(name);
  };

  const deleteFloor = (floorName: string) => {
      if (floors.length <= 1) {
          setToast({ message: "Cannot delete the last floor.", type: 'warning' });
          return;
      }
      
      const newFloors = floors.filter(f => f !== floorName);
      setFloors(newFloors);
      setNodes(nds => nds.filter(n => n.data.floor !== floorName));
      
      if (currentFloor === floorName) {
          setCurrentFloor(newFloors[0]);
      }
      setToast({ message: `Deleted ${floorName} and its devices.`, type: 'info' });
  };

  const renameFloor = (oldName: string) => {
      if (newFloorName && newFloorName !== oldName) {
          setFloors(floors.map(f => f === oldName ? newFloorName : f));
          setNodes(nodes.map(n => n.data.floor === oldName ? {...n, data: {...n.data, floor: newFloorName}} : n));
          if (currentFloor === oldName) setCurrentFloor(newFloorName);
      }
      setEditingFloor(null);
      setNewFloorName('');
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 flex-col font-sans">
      {/* Top Navigation Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
           <div className="bg-blue-600/20 p-1.5 rounded-lg border border-blue-500/30">
               <Network className="text-blue-500" size={20} />
           </div>
           <span className="font-bold text-gray-100 hidden md:block tracking-tight text-lg">NetArchitect <span className="text-blue-500">AI</span></span>
           <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400 border border-gray-700">v3.5</span>
        </div>

        {/* Floor Tabs */}
        <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800 overflow-x-auto max-w-[40vw] scrollbar-hide">
          {floors.map(floor => (
            <div key={floor} className="relative group flex items-center">
                {editingFloor === floor ? (
                    <input 
                       autoFocus
                       className="bg-black text-white text-xs px-2 py-1.5 rounded border border-blue-500 outline-none w-24"
                       value={newFloorName}
                       onChange={e => setNewFloorName(e.target.value)}
                       onBlur={() => renameFloor(floor)}
                       onKeyDown={e => e.key === 'Enter' && renameFloor(floor)}
                    />
                ) : (
                    <div className="flex bg-gray-900 rounded group-hover:bg-gray-800">
                      <button
                          onDoubleClick={() => { setEditingFloor(floor); setNewFloorName(floor); }}
                          onClick={() => {
                              setCurrentFloor(floor);
                              setSelectedNode(null);
                          }}
                          className={`px-3 py-1.5 rounded-l text-xs md:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                              currentFloor === floor 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Double click to rename"
                      >
                          <Building size={14} />
                          {floor}
                      </button>
                      <button 
                        onClick={() => deleteFloor(floor)}
                        className={`px-1.5 rounded-r hover:text-red-400 text-gray-600 ${currentFloor === floor ? 'bg-blue-600 text-blue-200 hover:bg-blue-500 hover:text-white' : 'hover:bg-gray-700'}`}
                      >
                         <Trash2 size={10} />
                      </button>
                    </div>
                )}
            </div>
          ))}
          <button onClick={addFloor} className="px-2 py-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded">
              <Plus size={14}/>
          </button>
        </div>

        <div className="flex gap-2">
          {/* File Actions */}
          <input type="file" ref={fileInputRef} onChange={loadTopology} className="hidden" accept=".json"/>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white" title="Import Topology"><Upload size={18}/></button>
          <button onClick={saveTopology} className="p-2 text-gray-400 hover:text-white" title="Export Topology"><Save size={18}/></button>
          
          <div className="w-px h-6 bg-gray-800 mx-1"></div>

          {/* Training Mode */}
          <button 
             onClick={() => setGameMode(!gameMode)}
             className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                gameMode ? 'bg-yellow-600 text-white border-transparent' : 'bg-gray-800 text-yellow-500 border-yellow-900/50 hover:bg-gray-700'
             }`}
          >
              <Gamepad2 size={16}/> {gameMode ? 'Missions Active' : 'Missions'}
          </button>

          {/* AI Tools */}
          <button 
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="hidden md:flex bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg border border-gray-700 items-center gap-2 text-xs font-medium transition-colors"
          >
            {isAnalyzing ? <div className="animate-spin h-3 w-3 border-2 border-white rounded-full"/> : <Wand2 size={14} />}
            Tips
          </button>
          <button 
            onClick={runSecurityScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
              isScanning ? 'bg-red-900/50 border-red-800' : 'bg-red-600 hover:bg-red-500 text-white border-transparent shadow-lg shadow-red-900/20'
            }`}
          >
             {isScanning ? <div className="animate-spin h-3 w-3 border-2 border-white rounded-full"/> : <ShieldAlert size={14} />}
             Scan
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <ReactFlowProvider>
          <Sidebar onLoadTemplate={loadTemplate} />
          
          <div className="flex-1 relative bg-gray-950" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={visibleNodes}
              edges={visibleEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodesDelete={onNodesDelete}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Background variant={BackgroundVariant.Dots} color="#374151" gap={20} />
              <Controls className="bg-gray-800 border-gray-700" />
              
              <div className="absolute top-4 left-4 pointer-events-none opacity-50 z-0">
                <h2 className="text-4xl md:text-6xl font-bold text-gray-800 tracking-tighter uppercase select-none">{currentFloor}</h2>
              </div>

              {/* Game Mode Panel */}
              {gameMode && <ChallengePanel nodes={nodes} edges={edges} onComplete={() => setToast({message: "Mission Completed!", type: 'info'})} />}

              {/* Top Right Panel */}
              <Panel position="top-right" className="flex flex-col gap-2 items-end">
                 {selectedNode && (
                   <div className="bg-gray-800/90 backdrop-blur p-3 rounded-lg border border-gray-700 shadow-xl flex flex-col gap-2 w-64 animate-in fade-in slide-in-from-right-2 z-50">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                         <span className="font-bold text-white text-sm truncate flex items-center gap-2">
                             {selectedNode.data.type === DeviceType.INTERNET ? <Globe size={14}/> : <Settings size={14}/>}
                             Config
                         </span>
                         <span className="text-[10px] bg-gray-700 px-1 rounded text-gray-400">{selectedNode.data.type}</span>
                      </div>
                      
                      {/* Quick Config Button */}
                      {!showQuickConfig && (
                          <div className="flex justify-between gap-1">
                             <button 
                                onClick={() => setShowQuickConfig(true)}
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-blue-300 font-medium transition-colors"
                             >
                                <Edit3 size={12} /> Edit Details
                             </button>
                          </div>
                      )}

                      {/* Quick Config Input */}
                      {showQuickConfig && (
                          <div className="bg-gray-900 p-2 rounded border border-gray-600 space-y-2">
                              <div>
                                  <label className="text-[10px] text-gray-400">Device Label</label>
                                  <input 
                                     type="text" 
                                     value={tempLabel} 
                                     onChange={(e) => setTempLabel(e.target.value)}
                                     className="w-full bg-black text-white text-xs p-1 rounded border border-gray-700 focus:border-blue-500 outline-none"
                                  />
                              </div>
                              {selectedNode.data.type !== DeviceType.INTERNET && (
                                  <div>
                                    <label className="text-[10px] text-gray-400">IP Address</label>
                                    <input 
                                        type="text" 
                                        value={tempIp} 
                                        onChange={(e) => setTempIp(e.target.value)}
                                        placeholder="e.g. 192.168.1.10"
                                        className="w-full bg-black text-white text-xs p-1 rounded border border-gray-700 focus:border-blue-500 outline-none font-mono"
                                    />
                                  </div>
                              )}
                              <div className="flex gap-1">
                                  <button onClick={saveConfig} className="flex-1 bg-blue-600 text-xs py-1 rounded text-white hover:bg-blue-500">Save</button>
                                  <button onClick={() => setShowQuickConfig(false)} className="px-2 bg-gray-700 text-xs py-1 rounded text-white hover:bg-gray-600">Cancel</button>
                              </div>
                          </div>
                      )}

                      {/* ISP Failover Action */}
                      {selectedNode.data.type === DeviceType.INTERNET && (
                           <button 
                              onClick={() => toggleIspFailover(selectedNode.id)}
                              className={`w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded text-xs font-bold transition-colors ${selectedNode.data.status === 'down' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                           >
                               <Globe size={12} /> {selectedNode.data.status === 'down' ? 'Restore Link' : 'Simulate Outage'}
                           </button>
                      )}

                      <div className="flex justify-between">
                        <button 
                          onClick={openTerminal}
                          className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-black hover:bg-gray-900 rounded text-xs text-green-500 font-mono transition-colors border border-gray-700"
                        >
                          <Terminal size={12} /> CLI
                        </button>
                        <button 
                           onClick={() => setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))}
                           className="ml-2 p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-900/50 transition-colors"
                           title="Delete Device"
                        >
                           <XCircle size={14} />
                        </button>
                      </div>
                   </div>
                 )}

                 <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => setShowPacketSim(!showPacketSim)}
                        className={`px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2 text-xs font-medium transition-colors border ${
                        showPacketSim ? 'bg-purple-900/40 text-purple-400 border-purple-800' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                        }`}
                    >
                        <PlayCircle size={14} /> Simulate Packet
                    </button>
                    <button 
                        onClick={toggleTraffic}
                        className={`px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2 text-xs font-medium transition-colors border ${
                        showTraffic ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                        }`}
                    >
                    <Activity size={14} /> {showTraffic ? 'Traffic: ON' : 'Traffic: OFF'}
                    </button>
                 </div>
              </Panel>

              {/* Bottom Center Panel for Analysis Results */}
              {(suggestions.length > 0 || securityReport) && (
                <Panel position="bottom-center" className="w-[600px] max-w-[95vw] mb-4">
                  <div className={`bg-gray-900/95 backdrop-blur border rounded-xl p-4 shadow-2xl flex flex-col max-h-[30vh] overflow-hidden ${securityReport ? 'border-red-500/50' : 'border-blue-500/50'}`}>
                    
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <h3 className={`font-bold flex items-center gap-2 ${securityReport ? 'text-red-400' : 'text-blue-400'}`}>
                        {securityReport ? <ShieldAlert size={18} /> : <Info size={18} />} 
                        {securityReport ? `Security Alert: ${securityReport.attackVector}` : 'Architecture Tips'}
                      </h3>
                      <button onClick={() => {setSuggestions([]); setSecurityReport(null);}} className="text-gray-400 hover:text-white"><Plus className="rotate-45" size={20}/></button>
                    </div>

                    <div className="overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                      {securityReport && (
                        <div className="p-3 rounded bg-red-950/30 border-l-4 border-red-600">
                           <p className="text-sm text-gray-200">{securityReport.description}</p>
                           <div className="mt-2 text-xs text-red-300 font-mono">
                              Vulnerable Nodes: {securityReport.vulnerableNodeIds.length > 0 ? securityReport.vulnerableNodeIds.length : 'None detected'}
                           </div>
                        </div>
                      )}

                      {suggestions.map((s, i) => (
                        <div key={i} className={`p-3 rounded border-l-4 ${s.type === 'security' ? 'border-red-500 bg-red-900/10' : 'border-blue-500 bg-blue-900/10'}`}>
                          <div className="font-bold text-gray-200 text-sm flex justify-between">
                            {s.title}
                            <span className="text-[10px] uppercase opacity-70 bg-gray-800 px-1 rounded">{s.priority}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{s.description}</div>
                        </div>
                      ))}
                    </div>

                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>

          <AIAssistant nodes={nodes} edges={edges} />

          <TerminalWindow 
            state={terminalState}
            deviceType={selectedNode?.data.type || 'Device'}
            onClose={() => setTerminalState(prev => ({ ...prev, isOpen: false }))}
            onUpdateState={(updates) => setTerminalState(prev => ({ ...prev, ...updates }))}
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
          />

          {showPacketSim && (
             <PacketSimulator 
                nodes={nodes} 
                edges={edges} 
                onClose={() => setShowPacketSim(false)} 
                onSimulate={handlePacketSimulate}
             />
          )}
        </ReactFlowProvider>
        
        {/* Global Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};

export default App;
