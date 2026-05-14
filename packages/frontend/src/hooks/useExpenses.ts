import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi, type Expense } from "../api/expenses.api.js";

export function useExpenses(params?: { buildingId?: number; month?: number; year?: number }) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => expensesApi.getAll(params),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
