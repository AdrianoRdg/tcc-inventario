import api from './api.ts';

export interface TopologyInterface {
  localPort: string;
  remoteHostname: string;
  remotePort: string;
}

export interface TopologyNode {
  hostname: string;
  description: string | null;
  interfaces: TopologyInterface[];
  // Novas propriedades opcionais para tratar o ACCESS_ERROR
  failed_name?: string;
  failed_ip?: string;
  failed_port?: number;
  level?: number;
}

export const topologyService = {
  getTopology: async (): Promise<TopologyNode[]> => {
    const response = await api.get<TopologyNode[]>('/topology');
    return response.data;
  }
};