import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { residentsApi, type Resident } from "../api/residents.api.js";

export function useResidents(buildingId?: number) {
  return useQuery({
    queryKey: ["residents", buildingId],
    queryFn: () => residentsApi.getAll(buildingId),
  });
}

export function useCreateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: residentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["residents"] }),
  });
}

export function useUpdateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Resident> }) =>
      residentsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["residents"] }),
  });
}

export function useDeleteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: residentsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["residents"] }),
  });
}
