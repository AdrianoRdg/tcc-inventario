// src/types/host.ts

export const DeviceStatus = {
  Online: "Online",
  Offline: "Offline",
} as const;

export type DeviceStatusType = typeof DeviceStatus[keyof typeof DeviceStatus];

export interface Host {
  id?: string | number; // O ID geralmente é gerado pelo backend
  name: string;
  ip: string;
  port: number;
  login: string;
  password?: string;    // Opcional, pois o backend pode não retornar a senha por segurança
  location: string;
  type: 'Switch' | 'Router' | 'Server' | string; // Você pode restringir os tipos aceitos
  status: 'Online' | 'Offline' | string;
  createdAt?: string;
}