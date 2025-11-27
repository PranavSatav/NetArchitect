
import { Node, Edge } from 'reactflow';

export enum DeviceType {
  ROUTER = 'ROUTER',
  SWITCH_L2 = 'SWITCH_L2',
  SWITCH_L3 = 'SWITCH_L3',
  FIREWALL = 'FIREWALL',
  PC = 'PC',
  LAPTOP = 'LAPTOP',
  SERVER = 'SERVER',
  ACCESS_POINT = 'ACCESS_POINT',
  PRINTER = 'PRINTER',
  PHONE = 'PHONE',
  HUB = 'HUB',
  INTERNET = 'INTERNET',
  SDWAN_EDGE = 'SDWAN_EDGE'
}

export interface InterfaceConfig {
  name: string;
  description?: string;
  ip?: string;
  mask?: string;
  shutdown: boolean;
  switchportMode?: 'access' | 'trunk' | 'dynamic';
  accessVlan?: number;
  trunkAllowedVlans?: string; // "1-4094" or "10,20"
  nativeVlan?: number;
}

export interface LineConfig {
  password?: string;
  login?: boolean;
}

export interface NetworkNodeData {
  label: string;
  type: DeviceType;
  ip?: string; // Mgmt IP or Loopback0
  mac?: string;
  status: 'up' | 'down' | 'booting';
  floor?: string;
  isVulnerable?: boolean;
  
  // Advanced Config State
  hostname?: string;
  domainName?: string;
  ipRouting?: boolean;
  
  // VLAN Database (ID -> Name)
  vlanDb?: Record<number, string>;
  
  // Interface Configurations
  interfaces?: Record<string, InterfaceConfig>; // Key: "GigabitEthernet0/1"
  
  // Line Configurations
  lines?: {
    console?: LineConfig;
    vty?: LineConfig;
  };

  // End Device Specifics
  assignedVlan?: number; 
  config?: {
    gateway?: string;
  };
}

export type NetworkNode = Node<NetworkNodeData>;

export interface TerminalState {
  isOpen: boolean;
  nodeId: string | null;
  history: string[];
  hostname: string;
  // Expanded Mode List
  mode: '>' | '#' | '(config)#' | '(config-if)#' | '(config-vlan)#' | '(config-line)#';
}

export interface AISuggestion {
  title: string;
  description: string;
  type: 'architecture' | 'security' | 'optimization';
  priority: 'low' | 'medium' | 'high';
}

export interface SecurityAnalysisResult {
  score: number;
  vulnerableNodeIds: string[];
  attackVector: string;
  description: string;
  recommendations: string[];
}

export interface PacketSimulationResult {
  success: boolean;
  path: string[];
  hops: number;
  message: string;
}
