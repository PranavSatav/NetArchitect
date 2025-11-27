
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DeviceType, NetworkNodeData } from '../types';
import { 
  Router, ArrowLeftRight, Shield, Monitor, Server, Wifi, Printer, Globe, CloudLightning, Laptop, Phone, Disc, Tag
} from 'lucide-react';

const getIcon = (type: DeviceType) => {
  switch (type) {
    case DeviceType.ROUTER: return <Router size={24} className="text-blue-400" />;
    case DeviceType.SWITCH_L2: return <ArrowLeftRight size={24} className="text-emerald-400" />;
    case DeviceType.SWITCH_L3: return <ArrowLeftRight size={24} className="text-teal-400" />;
    case DeviceType.FIREWALL: return <Shield size={24} className="text-red-500" />;
    case DeviceType.PC: return <Monitor size={24} className="text-gray-300" />;
    case DeviceType.LAPTOP: return <Laptop size={24} className="text-gray-300" />;
    case DeviceType.SERVER: return <Server size={24} className="text-purple-400" />;
    case DeviceType.ACCESS_POINT: return <Wifi size={24} className="text-yellow-400" />;
    case DeviceType.PRINTER: return <Printer size={24} className="text-gray-400" />;
    case DeviceType.PHONE: return <Phone size={24} className="text-pink-400" />;
    case DeviceType.HUB: return <Disc size={24} className="text-orange-300" />;
    case DeviceType.INTERNET: return <Globe size={32} className="text-blue-500" />;
    case DeviceType.SDWAN_EDGE: return <CloudLightning size={24} className="text-orange-400" />;
    default: return <Monitor size={24} />;
  }
};

const getNoviceDescription = (type: DeviceType) => {
  switch (type) {
    case DeviceType.ROUTER: return "Connects different networks (like Home to Internet). Uses IP addresses.";
    case DeviceType.SWITCH_L2: return "Connects devices (PCs, Printers) in the same office. Uses MAC addresses.";
    case DeviceType.FIREWALL: return "Security guard. Blocks bad traffic from entering your network.";
    case DeviceType.HUB: return "Old tech. connect one, connects all. Dumb switch.";
    case DeviceType.ACCESS_POINT: return "Broadcasts WiFi so wireless devices can connect.";
    default: return "";
  }
};

export const NetworkDeviceNode = memo(({ data, selected }: NodeProps<NetworkNodeData>) => {
  const isVulnerable = data.isVulnerable;
  const isDown = data.status === 'down';
  const desc = getNoviceDescription(data.type);
  
  // Visual color for VLAN badge
  const getVlanColor = (v: number) => {
      if (v === 10) return 'bg-orange-500';
      if (v === 20) return 'bg-purple-500';
      if (v === 30) return 'bg-pink-500';
      return 'bg-blue-500';
  };

  return (
    <div className={`
      relative group min-w-[120px] rounded-lg border-2 bg-gray-900/90 backdrop-blur-sm p-3 transition-all duration-300 shadow-xl
      ${selected ? 'border-blue-500 shadow-blue-500/20' : 'border-gray-700'}
      ${isVulnerable ? 'border-red-500 animate-pulse shadow-red-500/30' : ''}
      ${isDown ? 'opacity-60 grayscale' : ''}
    `}>
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} className="!bg-gray-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-gray-500 !w-3 !h-3" />

      {/* Warning/Status Indicators */}
      {isVulnerable && (
        <div className="absolute -top-3 -right-3 bg-red-600 rounded-full p-1 animate-bounce z-10">
          <Shield size={12} className="text-white" />
        </div>
      )}

      {/* VLAN Badge */}
      {data.assignedVlan && (
        <div className={`absolute -top-3 -left-3 ${getVlanColor(data.assignedVlan)} rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg flex items-center gap-1 z-10`}>
           <Tag size={8} /> V:{data.assignedVlan}
        </div>
      )}

      {/* Novice Tooltip (On Hover) */}
      {desc && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 bg-blue-900 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg border border-blue-500">
          {desc}
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-900 rotate-45 border-b border-r border-blue-500"></div>
        </div>
      )}
      
      {/* Device Body */}
      <div className="flex flex-col items-center gap-2">
        <div className={`p-2 rounded-full bg-gray-800 border border-gray-700 ${data.type === DeviceType.INTERNET ? 'animate-pulse' : ''}`}>
          {getIcon(data.type)}
        </div>
        
        <div className="text-center">
          <div className="text-xs font-bold text-gray-200 uppercase tracking-wider truncate max-w-[100px]">
            {data.label}
          </div>
          {data.ip && (
            <div className="text-[10px] text-gray-400 font-mono mt-0.5 bg-black/50 px-1 rounded">
              {data.ip}
            </div>
          )}
          <div className={`text-[9px] mt-1 font-bold ${isDown ? 'text-red-500' : 'text-green-500'}`}>
             {isDown ? '● DOWN' : '● ONLINE'}
          </div>
        </div>
      </div>
    </div>
  );
});
