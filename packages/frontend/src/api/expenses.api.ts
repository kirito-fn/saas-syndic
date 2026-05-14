import { api } from "./client.js";

export interface Expense {
  id: number;
  title: string;
  description?: string;
  amount: number;
  date: string;
  buildingId?: number | null;
  building?: { id: number; name: string } | null;
  createdBy?: { id: number; name: string };
}

export const expensesApi = {
  getAll: (params?: { buildingId?: number; month?: number; year?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.buildingId) searchParams.set("buildingId", String(params.buildingId));
    if (params?.month) searchParams.set("month", String(params.month));
    if (params?.year) searchParams.set("year", String(params.year));
    const qs = searchParams.toString();
    return api.get<Expense[]>(`/expenses${qs ? `?${qs}` : ""}`);
  },
  create: (data: { title: string; description?: string; amount: number; date: string; buildingId?: number | null }) =>
    api.post<Expense>("/expenses", data),
  update: (id: number, data: Partial<Expense>) =>
    api.put<Expense>(`/expenses/${id}`, data),
  delete: (id: number) => api.delete<void>(`/expenses/${id}`),
};
