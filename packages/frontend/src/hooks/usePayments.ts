import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, type Payment, type PaymentFilters } from "../api/payments.api.js";

export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () => paymentsApi.getAll(filters),
  });
}

export function useDeclarePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { month?: number; year?: number; notes?: string } }) =>
      paymentsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.verify,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUnverifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.unverify,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useResetPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.reset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarkAsUnpaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.markAsUnpaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useToggleNoPaymentFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.toggleNoPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useChangePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { newStatus: string; reason?: string } }) =>
      paymentsApi.changeStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function usePaymentLogs(id: number | null) {
  return useQuery({
    queryKey: ["payment-logs", id],
    queryFn: () => paymentsApi.getLogs(id!),
    enabled: id !== null,
  });
}
