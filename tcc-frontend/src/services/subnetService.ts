// src/services/subnetService.ts
import api from './api.ts';
import type { Subnet } from '../types/subnet.ts';

export const subnetService = {
  /**
   * Obtém todas as subnets cadastradas
   */
  getAll: async (): Promise<Subnet[]> => {
    const response = await api.get<Subnet[]>('/subnets');
    return response.data;
  },

  /**
   * Obtém apenas as subnets raiz (sem parentId)
   */
  getRoot: async (): Promise<Subnet[]> => {
    const response = await api.get<Subnet[]>('/subnets?parentId=null');
    return response.data;
  },

  /**
   * Obtém as subnets filhas de uma subnet específica
   */
  getChildren: async (parentId: string): Promise<Subnet[]> => {
    const response = await api.get<Subnet[]>(`/subnets/${parentId}/children`);
    return response.data;
  },

  /**
   * Busca uma subnet específica pelo ID
   */
  getById: async (id: string): Promise<Subnet> => {
    const response = await api.get<Subnet>(`/subnets/${id}`);
    return response.data;
  },

  /**
   * Cadastra uma nova subnet de rede (com ou sem parentId)
   */
  create: async (subnetData: Omit<Subnet, 'id' | 'createdAt' | 'updatedAt' | '_count'> | Omit<Subnet, 'id' | 'createdAt' | 'updatedAt' | '_count' | 'parentId'>): Promise<Subnet> => {
    const response = await api.post<Subnet>('/subnets', subnetData);
    return response.data;
  },

  /**
   * Atualiza os dados de uma subnet existente
   */
  update: async (id: string, updatedData: Partial<Omit<Subnet, 'id' | 'createdAt' | 'updatedAt' | '_count' | 'parentId'>>): Promise<Subnet> => {
    const response = await api.put<Subnet>(`/subnets/${id}`, updatedData);
    return response.data;
  },

  /**
   * Remove uma subnet do inventário
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/subnets/${id}`);
  }
};
