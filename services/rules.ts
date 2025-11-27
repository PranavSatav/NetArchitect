
import { DeviceType, NetworkNode, PacketSimulationResult } from '../types';
import { Edge } from 'reactflow';

export const validateConnection = (sourceType: DeviceType, targetType: DeviceType): { isValid: boolean; message: string; level?: 'warning' | 'error' | 'info' } => {
  if (sourceType === DeviceType.PC && targetType === DeviceType.PC) {
    return { isValid: true, message: 'PC connected directly to PC. Ensure IPs are in the same subnet.', level: 'warning' };
  }
  
  if (sourceType === DeviceType.INTERNET && targetType === DeviceType.PC) {
    return { isValid: true, message: 'DANGER: Direct Internet connection to PC! Please use a Firewall or Router.', level: 'error' };
  }

  if (sourceType === DeviceType.SWITCH_L2 && targetType === DeviceType.INTERNET) {
     return { isValid: true, message: 'L2 Switches cannot terminate ISP links directly without a Router/Gateway.', level: 'warning' };
  }

  return { isValid: true, message: 'Connection established.' };
};

// Helper to check valid IP (Simple IPv4 regex)
const isValidIP = (ip?: string) => ip && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip);

// Helper to get subnet (Assuming /24 Class C for Novice Simplicity)
const getSubnet = (ip: string) => ip.split('.').slice(0, 3).join('.');

// BFS for finding path with Layer 3 Logic
export const findPath = (nodes: NetworkNode[], edges: Edge[], startNodeId: string, endNodeId: string): PacketSimulationResult => {
  const startNode = nodes.find(n => n.id === startNodeId);
  const endNode = nodes.find(n => n.id === endNodeId);

  if (!startNode || !endNode) return { success: false, path: [], hops: 0, message: 'Device not found.' };

  // --- LAYER 3 LOGIC CHECKS ---
  
  // 1. Check IP Assignment
  if (!isValidIP(startNode.data.ip)) {
      return { success: false, path: [], hops: 0, message: `Configuration Error: Source device (${startNode.data.label}) is missing a valid IP address.` };
  }
  if (!isValidIP(endNode.data.ip)) {
      return { success: false, path: [], hops: 0, message: `Configuration Error: Destination device (${endNode.data.label}) is missing a valid IP address.` };
  }

  const sourceIP = startNode.data.ip!;
  const targetIP = endNode.data.ip!;
  const sourceSubnet = getSubnet(sourceIP);
  const targetSubnet = getSubnet(targetIP);
  const isSameSubnet = sourceSubnet === targetSubnet;

  // --- PHYSICAL CONNECTIVITY (BFS) ---
  const adjacencyList = new Map<string, string[]>();

  edges.forEach(edge => {
    if (!adjacencyList.has(edge.source)) adjacencyList.set(edge.source, []);
    if (!adjacencyList.has(edge.target)) adjacencyList.set(edge.target, []);
    adjacencyList.get(edge.source)?.push(edge.target);
    adjacencyList.get(edge.target)?.push(edge.source);
  });

  const queue: { id: string; path: string[] }[] = [{ id: startNodeId, path: [startNodeId] }];
  const visited = new Set<string>();
  visited.add(startNodeId);
  
  let physicalPath: string[] = [];
  let pathFound = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.id === endNodeId) {
      physicalPath = current.path;
      pathFound = true;
      break;
    }

    const neighbors = adjacencyList.get(current.id) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, path: [...current.path, neighborId] });
      }
    }
  }

  if (!pathFound) {
      return { success: false, path: [], hops: 0, message: 'Physical Link Error: No cable connection exists between these devices.' };
  }

  // --- PATH VALIDATION ---
  
  // Check for DOWN devices
  const brokenDevice = physicalPath.find(id => {
      const node = nodes.find(n => n.id === id);
      return node?.data.status === 'down';
  });

  if (brokenDevice) {
      const node = nodes.find(n => n.id === brokenDevice);
      return { success: false, path: physicalPath, hops: 0, message: `Link Failure: Packet dropped at ${node?.data.label} (Device is DOWN).` };
  }

  // Check Routing Requirements
  if (!isSameSubnet) {
      // If different subnets, path MUST contain a Router or L3 Switch
      const hasRouter = physicalPath.some(id => {
          const node = nodes.find(n => n.id === id);
          return node?.data.type === DeviceType.ROUTER || node?.data.type === DeviceType.SWITCH_L3 || node?.data.type === DeviceType.FIREWALL;
      });

      if (!hasRouter) {
          return { 
              success: false, 
              path: physicalPath, 
              hops: 0, 
              message: `Routing Error: Devices are in different subnets (${sourceSubnet}.x vs ${targetSubnet}.x) but no Router/Gateway was found in the path.` 
          };
      }
  }

  return {
    success: true,
    path: physicalPath,
    hops: physicalPath.length - 1,
    message: `Success! Packet delivered from ${sourceIP} to ${targetIP} via ${physicalPath.length - 1} hops.`
  };
};
