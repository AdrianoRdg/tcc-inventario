// src/services/hostService.ts
import api from './api.ts';
import type { Host } from '../types/host.ts';

export const hostService = {
  /**
   * Obtém todos os hosts cadastrados
   */
  getAll: async (): Promise<Host[]> => {
    const response = await api.get<Host[]>('/hosts');
    return response.data;
  },

  /**
   * Busca um host específico pelo ID
   */
  getById: async (id: string | number): Promise<Host> => {
    const response = await api.get<Host>(`/hosts/${id}`);
    return response.data;
  },

  /**
   * Cadastra um novo host de rede
   * O Omit remove o 'id' temporariamente, já que ele ainda será gerado pelo banco
   */
  create: async (hostData: Omit<Host, 'id'>): Promise<Host> => {
    const response = await api.post<Host>('/hosts', hostData);
    return response.data;
  },

  /**
   * Atualiza os dados de um host existente
   * O Partial faz com que todos os campos do Host sejam opcionais na hora de atualizar
   */
  update: async (id: string | number, updatedData: Partial<Host>): Promise<Host> => {
    const response = await api.put<Host>(`/hosts/${id}`, updatedData);
    return response.data;
  },

  /**
   * Remove um host do inventário
   */
  delete: async (id: string | number): Promise<void> => {
    await api.delete(`/hosts/${id}`);
  }
};