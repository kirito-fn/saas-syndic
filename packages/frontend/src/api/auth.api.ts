import { api } from "./client.js";
import type { LoginInput } from "@syndic/shared";

interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    buildingId: number | null;
    building?: { id: number; name: string } | null;
  };
}

export interface Manager {
  id: number;
  name: string;
  email: string;
  buildingId: number | null;
  building: { id: number; name: string } | null;
  createdAt: string;
}

export const authApi = {
  login: (input: LoginInput) => api.post<LoginResponse>("/auth/login", input),
  me: () => api.get<LoginResponse["user"]>("/auth/me"),
  listManagers: () => api.get<Manager[]>("/auth/managers"),
  createManager: (input: { email: string; password: string; name: string; buildingId: number }) =>
    api.post("/auth/signup", input),
  deleteManager: (id: number) => api.delete(`/auth/managers/${id}`),
  changePassword: (input: { oldPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", input),
  resetManagerPassword: (id: number, password?: string) =>
    api.post<{ password: string }>(`/auth/managers/${id}/reset-password`, { password }),
  assignBuilding: (id: number, buildingId: number) =>
    api.put(`/auth/managers/${id}/assign-building`, { buildingId }),
};
