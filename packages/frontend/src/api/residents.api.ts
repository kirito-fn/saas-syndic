import { api } from "./client.js";

export interface Resident {
  id: number;
  firstName: string;
  lastName: string;
  apartment: string;
  phone?: string | null;
  email?: string | null;
  buildingId: number;
  building?: { id: number; name: string };
  _count?: { payments: number };
}

export const residentsApi = {
  getAll: (buildingId?: number) => {
    const params = buildingId ? `?buildingId=${buildingId}` : "";
    return api.get<Resident[]>(`/residents${params}`);
  },
  getById: (id: number) => api.get<Resident>(`/residents/${id}`),
  create: (data: { firstName: string; lastName: string; apartment: string; phone?: string; email?: string; buildingId: number }) =>
    api.post<Resident>("/residents", data),
  update: (id: number, data: Partial<Resident>) =>
    api.put<Resident>(`/residents/${id}`, data),
  delete: (id: number) => api.delete<void>(`/residents/${id}`),
};
