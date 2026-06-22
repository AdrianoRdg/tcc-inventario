// src/services/api.ts
import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

const PORTA_BACKEND = '3333';

const api: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || (import.meta.env.DEV ? '/api' : `http://localhost:${PORTA_BACKEND}`),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor de Resposta com tipagem explicita
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (!error.response) {
      console.error('Erro de conexão: O backend parece estar offline.', error);
    } else {
      console.error(`Erro na API (${error.response.status}):`, error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;