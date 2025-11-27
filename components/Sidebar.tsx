
import React from 'react';
import { DeviceType } from '../types';
import { 
    Router, ArrowLeftRight, Shield, Monitor, Server, Wifi, Printer, Globe, CloudLightning, LayoutTemplate, Building2, Laptop, Phone, Disc 
} from 'lucide-react';

export const Sidebar = ({ onLoadTemplate }: { onLoadTemplate: (t: string) => void }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string, deviceType: DeviceType, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/deviceType', deviceType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const devices = [
    { type: DeviceType.ROUTER, label: 'Router', icon: <Router size={16} /> },
    { type: DeviceType.SWITCH_L2, label: 'Switch L2', icon: <ArrowLeftRight size={16} /> },
    { type: DeviceType.SWITCH_L3, label: 'Switch L3', icon: <ArrowLeftRight size={16} className="text-teal-400" /> },
    { type: DeviceType.FIREWALL, label: 'Firewall', icon: <Shield size={16} /> },
    { type: DeviceType.PC, label: 'PC', icon: <Monitor size={16} /> },
    { type: DeviceType.LAPTOP, label: 'Laptop', icon: <Laptop size={16} /> },
    { type: DeviceType.PHONE, label: 'VoIP Phone', icon: <Phone size={16} /> },
    { type: DeviceType.SERVER, label: 'Server', icon: <Server size={16} /> },
    { type: DeviceType.ACCESS_POINT, label: 'WiFi AP', icon: <Wifi size={16} /> },
    { type: DeviceType.HUB, label: 'Legacy Hub', icon: <Disc size={16} /> },
    { type: DeviceType.PRINTER, label: 'Printer', icon: <Printer size={16} /> },
    { type: DeviceType.INTERNET, label: 'ISP / Cloud', icon: <Globe size={16} /> },
    { type: DeviceType.SDWAN_EDGE, label: 'SD-WAN Box', icon: <CloudLightning size={16} /> },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full overflow-hidden shadow-xl z-10">
      {/* Top Half: Device Catalog */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-gray-800">
        <div className="p-3 bg-gray-900 sticky top-0 z-10 border-b border-gray-800">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Device Catalog</h2>
        </div>
        <div className="p-3 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-2 gap-2">
            {devices.map((device) => (
                <div
                key={device.type}
                className="bg-gray-800 p-3 rounded cursor-move hover:bg-gray-700 hover:ring-1 hover:ring-blue-500 transition-all flex flex-col items-center gap-2 group border border-gray-700/50"
                onDragStart={(event) => onDragStart(event, 'networkNode', device.type, device.label)}
                draggable
                >
                <div className="text-gray-400 group-hover:text-blue-400 transition-colors">{device.icon}</div>
                <span className="text-[10px] font-medium text-gray-300">{device.label}</span>
                </div>
            ))}
            </div>
        </div>
      </div>

      {/* Bottom Half: Templates */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-900/50">
        <div className="p-3 bg-gray-900 sticky top-0 z-10 border-b border-gray-800">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Templates</h2>
        </div>
        <div className="p-3 overflow-y-auto scrollbar-hide space-y-2">
           <button 
             onClick={() => onLoadTemplate('small-office')}
             className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded hover:bg-gray-700 text-left transition-colors border border-gray-700 hover:border-blue-500 group"
           >
             <LayoutTemplate size={16} className="text-purple-400 group-hover:scale-110 transition-transform"/>
             <div>
               <div className="text-xs font-bold text-gray-200">Small Office</div>
               <div className="text-[10px] text-gray-500">Router, Switch, AP</div>
             </div>
           </button>
           <button 
             onClick={() => onLoadTemplate('redundant-isp')}
             className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded hover:bg-gray-700 text-left transition-colors border border-gray-700 hover:border-blue-500 group"
           >
             <CloudLightning size={16} className="text-orange-400 group-hover:scale-110 transition-transform"/>
             <div>
               <div className="text-xs font-bold text-gray-200">SD-WAN Failover</div>
               <div className="text-[10px] text-gray-500">Dual ISP, Edge Device</div>
             </div>
           </button>
           <button 
             onClick={() => onLoadTemplate('enterprise-campus')}
             className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded hover:bg-gray-700 text-left transition-colors border border-gray-700 hover:border-blue-500 group"
           >
             <Building2 size={16} className="text-blue-400 group-hover:scale-110 transition-transform"/>
             <div>
               <div className="text-xs font-bold text-gray-200">Enterprise Campus</div>
               <div className="text-[10px] text-gray-500">3-Tier Architecture</div>
             </div>
           </button>
           <button 
             onClick={() => onLoadTemplate('data-center')}
             className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded hover:bg-gray-700 text-left transition-colors border border-gray-700 hover:border-blue-500 group"
           >
             <Server size={16} className="text-green-400 group-hover:scale-110 transition-transform"/>
             <div>
               <div className="text-xs font-bold text-gray-200">Data Center</div>
               <div className="text-[10px] text-gray-500">Spine-Leaf Topology</div>
             </div>
           </button>
        </div>
      </div>
      
      <div className="p-2 border-t border-gray-800 text-[9px] text-gray-600 text-center bg-gray-950">
         v3.2 • Drag items to canvas
      </div>
    </aside>
  );
};
