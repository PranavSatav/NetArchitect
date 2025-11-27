
import React, { useState, useEffect, useRef } from 'react';
import { TerminalState, NetworkNode, DeviceType, InterfaceConfig } from '../types';
import { Edge } from 'reactflow';
import { X, Layers, Terminal, ChevronRight, Sparkles } from 'lucide-react';
import { findPath } from '../services/rules';
import { getCLIFix } from '../services/geminiService';

interface Props {
  state: TerminalState;
  deviceType: string;
  nodes: NetworkNode[];
  edges: Edge[];
  onClose: () => void;
  onUpdateState: (s: Partial<TerminalState>) => void;
  setNodes: React.Dispatch<React.SetStateAction<NetworkNode[]>>;
}

// Mock system info
const SYSTEM_INFO = {
    version: '15.2(4)E',
    image: 'C2960-LANBASEK9-M',
    uptimeStart: Date.now(),
    serial: 'FCQ1928C01Y'
};

const WORKFLOWS = [
    {
        title: "Create a VLAN",
        steps: [
            { cmd: "enable", desc: "Enter Privileged Mode" },
            { cmd: "configure terminal", desc: "Enter Global Config" },
            { cmd: "vlan 10", desc: "Create VLAN ID 10" },
            { cmd: "name SALES", desc: "Name it 'SALES'" },
            { cmd: "exit", desc: "Return to Config Mode" }
        ]
    },
    {
        title: "Assign Port to VLAN",
        steps: [
            { cmd: "configure terminal", desc: "Global Config" },
            { cmd: "interface Gi0/1", desc: "Select 1st Port" },
            { cmd: "switchport mode access", desc: "Set Access Mode" },
            { cmd: "switchport access vlan 10", desc: "Assign VLAN 10" },
            { cmd: "no shutdown", desc: "Turn Port ON" }
        ]
    },
    {
        title: "Configure IP Address",
        steps: [
            { cmd: "configure terminal", desc: "Global Config" },
            { cmd: "interface Gi0/1", desc: "Select Interface" },
            { cmd: "ip address 192.168.1.1 255.255.255.0", desc: "Set IP & Mask" },
            { cmd: "no shutdown", desc: "Enable Interface" }
        ]
    },
    {
        title: "Setup Trunk Port",
        steps: [
            { cmd: "configure terminal", desc: "Global Config" },
            { cmd: "interface Gi0/24", desc: "Select Uplink Port" },
            { cmd: "switchport mode trunk", desc: "Set Trunk Mode" },
            { cmd: "switchport trunk allowed vlan 10,20", desc: "Allow Specific VLANs" }
        ]
    }
];

export const TerminalWindow: React.FC<Props> = ({ state, deviceType, nodes, edges, onClose, onUpdateState, setNodes }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Context State
  const [contextInt, setContextInt] = useState<string>(''); // e.g. "GigabitEthernet0/1"
  const [contextVlan, setContextVlan] = useState<number>(0);
  const [contextLine, setContextLine] = useState<string>('');
  
  const [isBooting, setIsBooting] = useState(false);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [activeTab, setActiveTab] = useState<'commands' | 'workflows'>('commands');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Initialize view
  useEffect(() => {
      if (state.isOpen) {
          if (state.history.length === 0 && output.length === 0) {
              setOutput([
                `NetOS (C) 2024 Systems, Inc.`,
                `Hardware: ${deviceType}`,
                `Press RETURN to get started.`
              ]);
          }
          setTimeout(() => inputRef.current?.focus(), 100);
      }
  }, [state.isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, isBooting]);

  // Dragging Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!state.isOpen) return null;

  // --- HELPER FUNCTIONS ---

  const matchCmd = (inputStr: string, target: string) => {
      if (!inputStr) return false;
      const inputParts = inputStr.trim().toLowerCase().split(/\s+/);
      const targetParts = target.toLowerCase().split(/\s+/);
      
      // Strict prefix matching for command keywords, allowing extra arguments
      if (inputParts.length > targetParts.length && targetParts.length > 1) {
          // Check prefix only if command has multiple words
      } 
      
      // Match the main command keywords
      for (let i = 0; i < targetParts.length; i++) {
          // If input is shorter than command (e.g. 'sh' for 'show'), allow it
          if (!inputParts[i]) return false;
          if (!targetParts[i].startsWith(inputParts[i])) return false;
      }
      return true;
  };
  
  const getNode = () => nodes.find(n => n.id === state.nodeId);

  // Port Mapping: Deterministically map edges to interface names (Gi0/1, Gi0/2...)
  const getSortedEdges = (nodeId: string) => {
      return edges
        .filter(e => e.source === nodeId || e.target === nodeId)
        .sort((a, b) => a.id.localeCompare(b.id)); // Sort by ID to keep order stable
  };

  const getInterfaceName = (idx: number) => `GigabitEthernet0/${idx + 1}`;
  const getShortInterfaceName = (idx: number) => `Gi0/${idx + 1}`;

  // Ensure interface config exists
  const ensureInterface = (node: NetworkNode, ifName: string): NetworkNode => {
      const newData = { ...node.data };
      if (!newData.interfaces) newData.interfaces = {};
      if (!newData.interfaces[ifName]) {
          newData.interfaces[ifName] = {
              name: ifName,
              shutdown: false,
              switchportMode: 'access', 
              accessVlan: 1,
              trunkAllowedVlans: '1-4094'
          };
      }
      return { ...node, data: newData };
  };

  // --- OUTPUT GENERATORS ---

  const getHelp = (mode: string) => {
      let cmds: {cmd: string, desc: string}[] = [];
      
      if (mode === '>') {
          cmds = [
              { cmd: "enable", desc: "Turn on privileged commands" },
              { cmd: "ping", desc: "Send echo messages" },
              { cmd: "show", desc: "Show running system information" },
              { cmd: "exit", desc: "Exit from the EXEC" }
          ];
      } else if (mode === '#') {
          cmds = [
              { cmd: "configure", desc: "Enter configuration mode" },
              { cmd: "show running-config", desc: "Show current config" },
              { cmd: "show vlan", desc: "Show VLAN information" },
              { cmd: "show ip interface", desc: "IP interface status" },
              { cmd: "reload", desc: "Halt and perform a cold restart" }
          ];
      } else if (mode === '(config)#') {
          cmds = [
              { cmd: "hostname", desc: "Set system network name" },
              { cmd: "interface", desc: "Select interface to configure" },
              { cmd: "vlan", desc: "VLAN configuration mode" },
              { cmd: "ip routing", desc: "Enable IP routing" },
              { cmd: "exit", desc: "Exit from configure mode" }
          ];
      } else if (mode === '(config-if)#') {
          cmds = [
              { cmd: "switchport", desc: "Set switching mode characteristics" },
              { cmd: "ip address", desc: "Set the IP address of an interface" },
              { cmd: "shutdown", desc: "Shutdown the selected interface" },
              { cmd: "no shutdown", desc: "Restart the selected interface" },
              { cmd: "exit", desc: "Exit from interface mode" }
          ];
      } else if (mode === '(config-vlan)#') {
          cmds = [
              { cmd: "name", desc: "Ascii name of the VLAN" },
              { cmd: "exit", desc: "Exit from VLAN mode" }
          ];
      }

      let out = "Exec commands:\n";
      cmds.forEach(c => {
          out += `  ${c.cmd.padEnd(20)} ${c.desc}\n`;
      });
      return out;
  };

  const getDynamicIpIntBrief = () => {
      const n = getNode();
      if (!n) return '';
      const nodeEdges = getSortedEdges(n.id);
      
      let out = `Interface              IP-Address      OK? Method Status                Protocol\n`;
      
      // List connected interfaces based on edges
      nodeEdges.forEach((e, idx) => {
          const ifName = getInterfaceName(idx);
          const config = n.data.interfaces?.[ifName];
          const ip = config?.ip || 'unassigned';
          const method = config?.ip ? 'manual' : 'unset';
          const adminStatus = config?.shutdown ? 'admin down' : 'up';
          const protoStatus = config?.shutdown ? 'down' : 'up';
          
          out += `${ifName.padEnd(22)} ${ip.padEnd(15)} YES ${method.padEnd(6)} ${adminStatus.padEnd(20)} ${protoStatus}\n`;
      });
      
      // If no edges, show at least one
      if (nodeEdges.length === 0) {
           out += `GigabitEthernet0/1     unassigned      YES unset  up                    down\n`;
      }
      
      return out;
  };

  const getRunningConfig = () => {
      const n = getNode();
      if (!n) return '';
      const d = n.data;
      
      let out = `Building configuration...\n\n`;
      out += `version 15.2\nhostname ${d.hostname || d.label}\n!\n`;
      
      if (d.vlanDb) {
          Object.entries(d.vlanDb).forEach(([vid, name]) => {
              out += `vlan ${vid}\n name ${name}\n!\n`;
          });
      }

      const sortedIfs = Object.keys(d.interfaces || {}).sort();
      sortedIfs.forEach(ifName => {
          const intConf = d.interfaces?.[ifName];
          out += `interface ${ifName}\n`;
          if (intConf?.description) out += ` description ${intConf.description}\n`;
          if (intConf?.switchportMode === 'access') {
             out += ` switchport mode access\n`;
             if (intConf.accessVlan !== 1) out += ` switchport access vlan ${intConf.accessVlan}\n`;
          }
          if (intConf?.switchportMode === 'trunk') {
             out += ` switchport mode trunk\n`;
             out += ` switchport trunk allowed vlan ${intConf.trunkAllowedVlans}\n`;
          }
          if (intConf?.ip) out += ` ip address ${intConf.ip} ${intConf.mask}\n`;
          if (intConf?.shutdown) out += ` shutdown\n`;
          out += `!\n`;
      });

      out += `end`;
      return out;
  };

  const getVlanBrief = () => {
      const n = getNode();
      if (!n) return '';
      const vlanDb = n.data.vlanDb || {1: 'default'};
      if (!vlanDb[1]) vlanDb[1] = 'default';

      let out = `VLAN Name                             Status    Ports\n`;
      out += `---- -------------------------------- --------- -------------------------------\n`;
      
      Object.entries(vlanDb).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([id, name]) => {
          // Find ports assigned to this VLAN by scanning config
          let ports: string[] = [];
          if (n.data.interfaces) {
              Object.values(n.data.interfaces).forEach((int) => {
                  const config = int as InterfaceConfig;
                  if (config.switchportMode === 'access' && (config.accessVlan || 1) == parseInt(id)) {
                      // Shorten name
                      ports.push(config.name.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa'));
                  }
              });
          }
          out += `${id.padEnd(4)} ${(name as string).padEnd(32)} active    ${ports.join(', ')}\n`;
      });
      return out;
  };

  // --- COMMAND LOGIC ---

  const handleCommand = () => {
      const cmdRaw = input;
      const cmd = input.trim();
      const tokens = cmd.split(/\s+/);
      const firstToken = tokens[0]?.toLowerCase();
      
      const newHistory = [...state.history, cmdRaw].filter(c => c);
      setHistoryIdx(-1);

      let response = '';
      let newMode = state.mode;
      let newHostname = state.hostname;
      let shouldClose = false;

      const appendOutput = (txt: string) => {
          const lines = txt.split('\n');
          setOutput(prev => [...prev, `${state.hostname}${state.mode} ${cmdRaw}`, ...lines].filter(Boolean));
      };

      // 1. GLOBAL COMMANDS
      if (cmd === '') {
          setOutput(prev => [...prev, `${state.hostname}${state.mode}`]);
          return;
      }
      if (cmd === 'exit') {
          if (state.mode === '(config-line)#') { newMode = '(config)#'; setContextLine(''); }
          else if (state.mode === '(config-if)#') { newMode = '(config)#'; setContextInt(''); }
          else if (state.mode === '(config-vlan)#') { newMode = '(config)#'; setContextVlan(0); }
          else if (state.mode === '(config)#') newMode = '#';
          else if (state.mode === '#') newMode = '>';
          else shouldClose = true;
      }
      else if (cmd === 'end') {
          newMode = '#';
          setContextInt(''); setContextLine(''); setContextVlan(0);
      }
      else if (cmd === '?' || cmd === 'help') {
          response = getHelp(state.mode);
      }
      else if (cmd === 'clear' || cmd === 'cls') {
          setOutput([]);
          return;
      }
      // DO support
      else if (firstToken === 'do') {
          const subCmd = cmd.substring(3).trim();
          if (matchCmd(subCmd, 'show run')) response = getRunningConfig();
          else if (matchCmd(subCmd, 'show vlan')) response = getVlanBrief();
          else if (matchCmd(subCmd, 'show ip int')) response = getDynamicIpIntBrief();
          else if (matchCmd(subCmd, 'ping')) response = 'Sending 5, 100-byte ICMP Echos... !!!!!';
          else response = '% Unrecognized command';
      }

      // 2. USER EXEC (>)
      else if (state.mode === '>') {
          if (matchCmd(cmd, 'enable') || cmd === 'en') newMode = '#';
          else if (matchCmd(cmd, 'ping')) {
              const targetIP = tokens[1];
              if(!targetIP) response = '% Incomplete command.';
              else {
                  const targetNode = nodes.find(n => n.data.ip === targetIP);
                  if (targetNode) {
                      const res = findPath(nodes, edges, state.nodeId!, targetNode.id);
                      if (res.success) response = `Sending 5, 100-byte ICMP Echos to ${targetIP}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5).`;
                      else response = `Sending 5, 100-byte ICMP Echos to ${targetIP}, timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5).\n${res.message}`;
                  } else {
                      response = `Sending 5, 100-byte ICMP Echos to ${targetIP}, timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5).`;
                  }
              }
          }
          else if (matchCmd(cmd, 'show version') || cmd === 'sh ver') response = `Cisco IOS Software, ${SYSTEM_INFO.version}\nSystem image file is "flash:${SYSTEM_INFO.image}.bin"`;
          else if (cmd !== 'exit') response = '% Unknown command';
      }

      // 3. PRIVILEGED EXEC (#)
      else if (state.mode === '#') {
          if (matchCmd(cmd, 'configure terminal') || cmd === 'conf t') {
              newMode = '(config)#';
              response = 'Enter configuration commands, one per line.  End with CNTL/Z.';
          }
          else if (matchCmd(cmd, 'show running-config') || cmd === 'sh run') response = getRunningConfig();
          else if (matchCmd(cmd, 'show vlan brief') || cmd === 'sh vlan br' || cmd === 'sh vlan') response = getVlanBrief();
          else if (matchCmd(cmd, 'show ip interface brief') || cmd === 'sh ip int br') response = getDynamicIpIntBrief();
          else if (matchCmd(cmd, 'reload')) {
              setIsBooting(true);
              setOutput([]);
              setTimeout(() => {
                  setIsBooting(false);
                  setOutput(['Press RETURN to get started.']);
                  setContextInt(''); setContextLine(''); setContextVlan(0);
                  onUpdateState({ mode: '>', hostname: state.hostname });
              }, 3000);
              return; 
          }
          else if (firstToken === 'vlan') {
               response = '% Incomplete command. Use "configure terminal" first.';
          }
          else if (cmd !== 'exit') response = '% Unknown command';
      }

      // 4. GLOBAL CONFIG ((config)#)
      else if (state.mode === '(config)#') {
          if (matchCmd(cmd, 'hostname')) {
              const name = tokens[1];
              if (name) {
                  newHostname = name;
                  setNodes(nds => nds.map(n => n.id === state.nodeId ? { ...n, data: { ...n.data, hostname: name, label: name } } : n));
              }
          }
          else if (matchCmd(cmd, 'interface')) {
              const intName = tokens[1];
              if (intName) {
                  // Normalize Gi0/1 -> GigabitEthernet0/1
                  let fullName = intName;
                  if (intName.toLowerCase().startsWith('g')) fullName = intName.replace(/^g[a-z]*/i, 'GigabitEthernet');
                  else if (intName.toLowerCase().startsWith('f')) fullName = intName.replace(/^f[a-z]*/i, 'FastEthernet');

                  newMode = '(config-if)#';
                  setContextInt(fullName);
                  setNodes(nds => nds.map(n => n.id === state.nodeId ? ensureInterface(n, fullName) : n));
              } else {
                  response = '% Incomplete command.';
              }
          }
          else if (firstToken === 'vlan') {
              if (!getNode()?.data.type.includes('SWITCH')) {
                  response = '% Command rejected: Device does not support VLANs.';
              } else {
                  const vid = parseInt(tokens[1]);
                  if (!isNaN(vid)) {
                      newMode = '(config-vlan)#';
                      setContextVlan(vid);
                      setNodes(nds => nds.map(n => {
                          if (n.id === state.nodeId) {
                              const vlanDb = n.data.vlanDb || {1: 'default'};
                              if (!vlanDb[vid]) vlanDb[vid] = `VLAN${vid.toString().padStart(4, '0')}`;
                              return { ...n, data: { ...n.data, vlanDb } };
                          }
                          return n;
                      }));
                  } else {
                      response = '% Invalid input detected at marker.';
                  }
              }
          }
          else if (matchCmd(cmd, 'ip routing')) {
              setNodes(nds => nds.map(n => n.id === state.nodeId ? { ...n, data: { ...n.data, ipRouting: true } } : n));
          }
          else if (cmd !== 'exit') response = '% Invalid input detected at marker.';
      }

      // 5. INTERFACE CONFIG ((config-if)#)
      else if (state.mode === '(config-if)#') {
          const updateInt = (updater: (c: InterfaceConfig) => InterfaceConfig) => {
              setNodes(nds => nds.map(n => {
                  if (n.id === state.nodeId && n.data.interfaces && n.data.interfaces[contextInt]) {
                      const newInterfaces = { ...n.data.interfaces };
                      newInterfaces[contextInt] = updater({ ...newInterfaces[contextInt] });
                      return { ...n, data: { ...n.data, interfaces: newInterfaces } };
                  }
                  return n;
              }));
          };

          if (matchCmd(cmd, 'shutdown') || cmd === 'shut') {
              updateInt(c => ({ ...c, shutdown: true }));
              response = `%LINK-5-CHANGED: Interface ${contextInt}, changed state to administratively down`;
          }
          else if (matchCmd(cmd, 'no shutdown') || cmd === 'no shut') {
              updateInt(c => ({ ...c, shutdown: false }));
              response = `%LINK-3-UPDOWN: Interface ${contextInt}, changed state to up`;
          }
          else if (matchCmd(cmd, 'switchport mode')) {
              const mode = cmd.includes('trunk') ? 'trunk' : 'access';
              updateInt(c => ({ ...c, switchportMode: mode }));
          }
          else if (matchCmd(cmd, 'switchport access vlan')) {
              const vid = parseInt(cmd.split(' ').pop() || '1');
              if (!isNaN(vid)) {
                  updateInt(c => ({ ...c, accessVlan: vid }));
                  
                  // SMART FEATURE: Propagate VLAN to connected end-device for visual feedback
                  // 1. Find the edge connected to this interface "index"
                  const nodeEdges = getSortedEdges(state.nodeId!);
                  // Extract index from name "GigabitEthernet0/1" -> 1. Map to array index 0.
                  const match = contextInt.match(/\d+$/);
                  if (match) {
                      const portIdx = parseInt(match[0]) - 1; // Gi0/1 -> index 0
                      const targetEdge = nodeEdges[portIdx];
                      if (targetEdge) {
                          const neighborId = targetEdge.source === state.nodeId ? targetEdge.target : targetEdge.source;
                          setNodes(nds => nds.map(n => {
                              if (n.id === neighborId && (n.data.type === DeviceType.PC || n.data.type === DeviceType.PRINTER || n.data.type === DeviceType.SERVER)) {
                                  return { ...n, data: { ...n.data, assignedVlan: vid } };
                              }
                              return n;
                          }));
                          response = `[Sim]: Assigned neighbor device on ${contextInt} to VLAN ${vid}`;
                      }
                  }
              }
          }
          else if (matchCmd(cmd, 'switchport trunk allowed vlan')) {
              const vlanStr = cmd.split('vlan')[1]?.trim();
              if (vlanStr) updateInt(c => ({ ...c, trunkAllowedVlans: vlanStr }));
          }
          else if (matchCmd(cmd, 'ip address')) {
              const parts = cmd.split(' ');
              if (parts.length >= 4) updateInt(c => ({ ...c, ip: parts[2], mask: parts[3] }));
              else response = '% Incomplete command.';
          }
          else if (cmd !== 'exit') response = '% Invalid input detected at marker.';
      }

      // 6. VLAN CONFIG ((config-vlan)#)
      else if (state.mode === '(config-vlan)#') {
          if (matchCmd(cmd, 'name')) {
              const name = tokens[1];
              if (name) {
                  setNodes(nds => nds.map(n => {
                      if (n.id === state.nodeId && n.data.vlanDb) {
                          const newVlanDb = { ...n.data.vlanDb };
                          newVlanDb[contextVlan] = name;
                          return { ...n, data: { ...n.data, vlanDb: newVlanDb } };
                      }
                      return n;
                  }));
              }
          }
          else if (firstToken === 'vlan' || !isNaN(parseInt(firstToken))) {
             response = '% Invalid input. Type "exit" to return to global config mode first.';
          }
          else if (cmd !== 'exit') response = '% Invalid input detected at marker.';
      }

      if (shouldClose) {
          onClose();
          return;
      }

      appendOutput(response);
      onUpdateState({ 
          mode: newMode, 
          hostname: newHostname, 
          history: newHistory 
      });
      setInput('');

      // TRIGGER AI FIX IF ERROR
      if (response.startsWith('%')) {
          getCLIFix(cmdRaw, response).then(tip => {
              if (tip) {
                  setOutput(prev => [...prev, `[AI Tip]: ${tip}`]);
              }
          });
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const cmds = ['show', 'configure', 'enable', 'interface', 'vlan', 'ping', 'exit', 'switchport', 'no shutdown'];
        const match = cmds.find(c => c.startsWith(input));
        if (match) setInput(match + ' ');
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.history.length > 0) {
            const newIdx = historyIdx === -1 ? 0 : Math.min(historyIdx + 1, state.history.length - 1);
            setHistoryIdx(newIdx);
            setInput(state.history[state.history.length - 1 - newIdx]);
        }
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIdx > 0) {
            setHistoryIdx(historyIdx - 1);
            setInput(state.history[state.history.length - 1 - (historyIdx - 1)]);
        } else {
            setHistoryIdx(-1);
            setInput('');
        }
    }
    if (e.key === 'Enter') handleCommand();
  };

  const insertWorkflowCommand = (cmd: string) => {
      setInput(cmd);
      inputRef.current?.focus();
  };

  return (
    <div 
        ref={windowRef}
        style={{ top: position.y, left: position.x }}
        className="fixed w-[950px] h-[650px] bg-[#1a1a1a] shadow-2xl rounded-lg flex flex-col z-[100] border border-gray-600 font-mono text-sm overflow-hidden"
    >
      {/* Header */}
      <div 
        onMouseDown={handleMouseDown}
        className="h-9 bg-[#2d2d2d] flex justify-between items-center px-3 cursor-move select-none border-b border-gray-600"
      >
         <div className="flex items-center gap-2 text-gray-300 font-bold text-xs">
            <Terminal size={12} className="text-gray-400"/>
            <span className="ml-2 font-mono opacity-80">{state.hostname} - {contextInt || contextLine || (contextVlan ? `VLAN ${contextVlan}` : '')}</span>
            <span className="text-[10px] bg-gray-700 px-1 rounded text-gray-400 uppercase">{state.mode === '>' ? 'User Exec' : state.mode === '#' ? 'Priv Exec' : 'Config Mode'}</span>
         </div>
         <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={14}/></button>
      </div>

      <div className="flex flex-1 overflow-hidden">
         {/* Terminal Output */}
         <div className="flex-1 bg-black text-[#0f0] p-3 overflow-y-auto font-mono text-sm leading-snug" onClick={() => inputRef.current?.focus()}>
            {output.map((line, i) => {
                const isAI = line.startsWith('[AI Tip]');
                return (
                    <div key={i} className={`whitespace-pre-wrap mb-0.5 ${isAI ? 'text-yellow-400 italic' : ''}`}>
                       {isAI && <Sparkles size={10} className="inline mr-1"/>}
                       {line}
                    </div>
                );
            })}
            <div ref={bottomRef} />
            
            {!isBooting && (
                <div className="flex mt-2">
                    <span className="mr-2 font-bold text-emerald-500 whitespace-nowrap">{state.hostname}{state.mode}</span>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent outline-none text-[#0f0] border-none p-0 focus:ring-0"
                        autoComplete="off"
                        autoFocus
                    />
                </div>
            )}
         </div>

         {/* Quick Reference Sidebar */}
         <div className="w-64 bg-[#252525] border-l border-gray-600 flex flex-col text-gray-300 text-xs">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-gray-700">
                <button 
                    onClick={() => setActiveTab('commands')}
                    className={`flex-1 py-2 font-bold text-center border-b-2 transition-colors ${activeTab === 'commands' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    Ref
                </button>
                <button 
                    onClick={() => setActiveTab('workflows')}
                    className={`flex-1 py-2 font-bold text-center border-b-2 transition-colors ${activeTab === 'workflows' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    Workflows
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'commands' && (
                    <div className="space-y-4">
                        <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded text-[10px] text-blue-200 mb-2">
                            Type <b>?</b> in any mode to see specific commands.
                        </div>
                        <div>
                            <div className="font-bold text-green-400 mb-1">User Exec {'>'}</div>
                            <code className="block text-gray-400">enable</code>
                            <code className="block text-gray-400">ping &lt;ip&gt;</code>
                            <code className="block text-gray-400">show version</code>
                        </div>
                        <div>
                            <div className="font-bold text-yellow-400 mb-1">Priv Exec {'#'}</div>
                            <code className="block text-gray-400">conf t</code>
                            <code className="block text-gray-400">show run</code>
                            <code className="block text-gray-400">show vlan br</code>
                        </div>
                        <div>
                            <div className="font-bold text-blue-400 mb-1">Global Config</div>
                            <code className="block text-gray-400">hostname &lt;name&gt;</code>
                            <code className="block text-gray-400">interface &lt;name&gt;</code>
                            <code className="block text-gray-400">vlan &lt;id&gt;</code>
                        </div>
                        <div>
                            <div className="font-bold text-purple-400 mb-1">Interface Config</div>
                            <code className="block text-gray-400">switchport mode access</code>
                            <code className="block text-gray-400">switchport access vlan 10</code>
                            <code className="block text-gray-400">ip address &lt;ip&gt; &lt;mask&gt;</code>
                            <code className="block text-gray-400">no shut</code>
                        </div>
                    </div>
                )}

                {activeTab === 'workflows' && (
                    <div className="space-y-4">
                         <div className="text-[10px] text-gray-500 italic mb-2">Click a step to paste command.</div>
                         {WORKFLOWS.map((wf, i) => (
                             <div key={i} className="mb-4">
                                 <div className="font-bold text-white mb-2 flex items-center gap-1">
                                    <Layers size={12} className="text-blue-400"/> {wf.title}
                                 </div>
                                 <div className="space-y-1">
                                    {wf.steps.map((step, j) => (
                                        <button 
                                            key={j}
                                            onClick={() => insertWorkflowCommand(step.cmd)}
                                            className="w-full text-left bg-gray-800 hover:bg-gray-700 p-1.5 rounded group flex items-center justify-between transition-colors border border-transparent hover:border-gray-600"
                                        >
                                            <div>
                                                <div className="font-mono text-green-400 text-[10px]">{step.cmd}</div>
                                                <div className="text-[9px] text-gray-500">{step.desc}</div>
                                            </div>
                                            <ChevronRight size={10} className="text-gray-600 group-hover:text-white opacity-0 group-hover:opacity-100"/>
                                        </button>
                                    ))}
                                 </div>
                             </div>
                         ))}
                    </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};
