export interface Subnet {
  id: string;
  network: string;
  description: string;
  vlan: number | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    children: number;
    hosts: number;
  };
}
