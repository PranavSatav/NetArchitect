import { DeviceType, NetworkNode } from './types';
import { Edge } from 'reactflow';

export const INITIAL_NODES: NetworkNode[] = [
  {
    id: 'isp-1',
    type: 'networkNode',
    position: { x: 250, y: 0 },
    data: { label: 'ISP Primary', type: DeviceType.INTERNET, status: 'up', ip: '8.8.8.8' }
  },
  {
    id: 'router-1',
    type: 'networkNode',
    position: { x: 250, y: 150 },
    data: { label: 'Edge Router', type: DeviceType.ROUTER, status: 'up', ip: '192.168.1.1' }
  }
];

export const NETWORK_TEMPLATES: Record<string, (floor: string) => { nodes: NetworkNode[], edges: Edge[] }> = {
  'small-office': (floor) => {
    const baseId = Date.now();
    return {
      nodes: [
        { id: `r-${baseId}`, type: 'networkNode', position: { x: 250, y: 50 }, data: { label: 'Gateway Router', type: DeviceType.ROUTER, status: 'up', floor } },
        { id: `sw-${baseId}`, type: 'networkNode', position: { x: 250, y: 200 }, data: { label: 'Core Switch', type: DeviceType.SWITCH_L2, status: 'up', floor } },
        { id: `ap-${baseId}`, type: 'networkNode', position: { x: 100, y: 350 }, data: { label: 'Wifi AP', type: DeviceType.ACCESS_POINT, status: 'up', floor } },
        { id: `pc-${baseId}`, type: 'networkNode', position: { x: 400, y: 350 }, data: { label: 'User PC', type: DeviceType.PC, status: 'up', floor } },
      ],
      edges: [
        { id: `e1-${baseId}`, source: `r-${baseId}`, target: `sw-${baseId}`, animated: true },
        { id: `e2-${baseId}`, source: `sw-${baseId}`, target: `ap-${baseId}` },
        { id: `e3-${baseId}`, source: `sw-${baseId}`, target: `pc-${baseId}` },
      ]
    };
  },
  'redundant-isp': (floor) => {
    const baseId = Date.now();
    return {
      nodes: [
        { id: `isp1-${baseId}`, type: 'networkNode', position: { x: 100, y: 0 }, data: { label: 'ISP Fiber', type: DeviceType.INTERNET, status: 'up', floor } },
        { id: `isp2-${baseId}`, type: 'networkNode', position: { x: 400, y: 0 }, data: { label: 'ISP 5G Backup', type: DeviceType.INTERNET, status: 'up', floor } },
        { id: `sdwan-${baseId}`, type: 'networkNode', position: { x: 250, y: 150 }, data: { label: 'SD-WAN Edge', type: DeviceType.SDWAN_EDGE, status: 'up', floor } },
      ],
      edges: [
        { id: `e1-${baseId}`, source: `isp1-${baseId}`, target: `sdwan-${baseId}`, animated: true, style: { stroke: '#22c55e' } },
        { id: `e2-${baseId}`, source: `isp2-${baseId}`, target: `sdwan-${baseId}`, animated: true, style: { stroke: '#f59e0b', strokeDasharray: 5 } },
      ]
    };
  },
  'enterprise-campus': (floor) => {
    const baseId = Date.now();
    return {
      nodes: [
        { id: `core-${baseId}`, type: 'networkNode', position: { x: 300, y: 50 }, data: { label: 'Core L3 Switch', type: DeviceType.SWITCH_L3, status: 'up', floor } },
        { id: `dist1-${baseId}`, type: 'networkNode', position: { x: 150, y: 200 }, data: { label: 'Dist Switch A', type: DeviceType.SWITCH_L2, status: 'up', floor } },
        { id: `dist2-${baseId}`, type: 'networkNode', position: { x: 450, y: 200 }, data: { label: 'Dist Switch B', type: DeviceType.SWITCH_L2, status: 'up', floor } },
        { id: `acc1-${baseId}`, type: 'networkNode', position: { x: 50, y: 350 }, data: { label: 'Access SW 1', type: DeviceType.SWITCH_L2, status: 'up', floor } },
        { id: `acc2-${baseId}`, type: 'networkNode', position: { x: 250, y: 350 }, data: { label: 'Access SW 2', type: DeviceType.SWITCH_L2, status: 'up', floor } },
      ],
      edges: [
        { id: `e1-${baseId}`, source: `core-${baseId}`, target: `dist1-${baseId}` },
        { id: `e2-${baseId}`, source: `core-${baseId}`, target: `dist2-${baseId}` },
        { id: `e3-${baseId}`, source: `dist1-${baseId}`, target: `acc1-${baseId}` },
        { id: `e4-${baseId}`, source: `dist1-${baseId}`, target: `acc2-${baseId}` },
        { id: `e5-${baseId}`, source: `dist2-${baseId}`, target: `acc1-${baseId}`, style: { strokeDasharray: 5 } }, // Redundant link
      ]
    };
  },
  'data-center': (floor) => {
    const baseId = Date.now();
    return {
      nodes: [
        { id: `fw-${baseId}`, type: 'networkNode', position: { x: 300, y: 0 }, data: { label: 'NG Firewall', type: DeviceType.FIREWALL, status: 'up', floor } },
        { id: `spine1-${baseId}`, type: 'networkNode', position: { x: 150, y: 150 }, data: { label: 'Spine 1', type: DeviceType.SWITCH_L3, status: 'up', floor } },
        { id: `spine2-${baseId}`, type: 'networkNode', position: { x: 450, y: 150 }, data: { label: 'Spine 2', type: DeviceType.SWITCH_L3, status: 'up', floor } },
        { id: `leaf1-${baseId}`, type: 'networkNode', position: { x: 100, y: 300 }, data: { label: 'Leaf 1', type: DeviceType.SWITCH_L2, status: 'up', floor } },
        { id: `leaf2-${baseId}`, type: 'networkNode', position: { x: 500, y: 300 }, data: { label: 'Leaf 2', type: DeviceType.SWITCH_L2, status: 'up', floor } },
        { id: `srv1-${baseId}`, type: 'networkNode', position: { x: 100, y: 450 }, data: { label: 'Web Server', type: DeviceType.SERVER, status: 'up', floor } },
        { id: `srv2-${baseId}`, type: 'networkNode', position: { x: 500, y: 450 }, data: { label: 'DB Server', type: DeviceType.SERVER, status: 'up', floor } },
      ],
      edges: [
        { id: `e1-${baseId}`, source: `fw-${baseId}`, target: `spine1-${baseId}` },
        { id: `e2-${baseId}`, source: `fw-${baseId}`, target: `spine2-${baseId}` },
        { id: `e3-${baseId}`, source: `spine1-${baseId}`, target: `leaf1-${baseId}` },
        { id: `e4-${baseId}`, source: `spine1-${baseId}`, target: `leaf2-${baseId}` },
        { id: `e5-${baseId}`, source: `spine2-${baseId}`, target: `leaf1-${baseId}` },
        { id: `e6-${baseId}`, source: `spine2-${baseId}`, target: `leaf2-${baseId}` },
        { id: `e7-${baseId}`, source: `leaf1-${baseId}`, target: `srv1-${baseId}` },
        { id: `e8-${baseId}`, source: `leaf2-${baseId}`, target: `srv2-${baseId}` },
      ]
    };
  }
};