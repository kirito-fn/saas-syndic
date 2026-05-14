import { api } from "./client.js";

export interface Building {
  id: number;
  name: string;
  address?: string;
  _count?: { residents: number; payments: number };
}

export const buildingsApi = {
  getAll: () => api.get<Building[]>("/buildings"),
  getById: (id: number) => api.get<Building>(`/buildings/${id}`),
  create: (data: { name: string; address?: string }) =>
    api.post<Building>("/buildings", data),
  update: (id: number, data: { name?: string; address?: string }) =>
    api.put<Building>(`/buildings/${id}`, data),
  delete: (id: number, force = false) => api.delete<void>(`/buildings/${id}${force ? '?force=true' : ''}`),
};
