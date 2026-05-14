import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildingsApi, type Building } from "../api/buildings.api.js";

export function useBuildings() {
  return useQuery({
    queryKey: ["buildings"],
    queryFn: buildingsApi.getAll,
  });
}

export function useCreateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: buildingsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
  });
}

export function useUpdateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Building> }) =>
      buildingsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
  });
}

export function useDeleteBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) =>
      buildingsApi.delete(id, force),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
  });
}
