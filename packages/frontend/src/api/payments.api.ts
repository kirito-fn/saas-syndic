import { api } from "./client.js";

export interface Payment {
  id: number;
  residentId: number;
  buildingId: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  notes?: string;
  noPaymentAt?: string;
  declaredAt?: string;
  verifiedAt?: string;
  resident?: { id: number; firstName: string; lastName: string; apartment: string };
  building?: { id: number; name: string };
  declaredBy?: { id: number; name: string };
  verifiedBy?: { id: number; name: string };
}

export interface PaymentFilters {
  buildingId?: number;
  month?: number;
  year?: number;
  status?: string;
}

export const paymentsApi = {
  getAll: (filters?: PaymentFilters) => {
    const params = new URLSearchParams();
    if (filters?.buildingId) params.set("buildingId", String(filters.buildingId));
    if (filters?.month) params.set("month", String(filters.month));
    if (filters?.year) params.set("year", String(filters.year));
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    return api.get<Payment[]>(`/payments${qs ? `?${qs}` : ""}`);
  },
  getById: (id: number) => api.get<Payment>(`/payments/${id}`),
  create: (data: { residentId: number; month: number; year: number; notes?: string; directPaid?: boolean }) =>
    api.post<Payment>("/payments", data),
  update: (id: number, data: { month?: number; year?: number; notes?: string }) =>
    api.put<Payment>(`/payments/${id}`, data),
  verify: (id: number) => api.patch<Payment>(`/payments/${id}/verify`),
  unverify: (id: number) => api.patch<Payment>(`/payments/${id}/unverify`),
  reset: (id: number) => api.patch<Payment>(`/payments/${id}/reset`),
  markAsUnpaid: (id: number) => api.patch<Payment>(`/payments/${id}/mark-unpaid`),
  toggleNoPayment: (id: number) => api.patch<Payment>(`/payments/${id}/no-payment`),
  changeStatus: (id: number, data: { newStatus: string; reason?: string }) =>
    api.post<Payment>(`/payments/${id}/status`, data),
  getLogs: (id: number) => api.get<PaymentLog[]>(`/payments/${id}/logs`),
};

export interface PaymentLog {
  id: number;
  paymentId: number;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  changedBy: { id: number; name: string };
  createdAt: string;
}
